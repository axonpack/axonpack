import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { S3Config } from "../../s3/s3.service";
import { PLUGIN_NAME } from "../../../utils/config/expo-config.util";
import { fingerprint } from "../../cli/project.service";
import { buildBundle } from "../bundle.service";
import { PublishOptions, prune, publish, unpublish } from "../commands.service";
import { prepareCopy, removeInBackground } from "../copy.service";
import { buildFileSets } from "../file-sets.service";

// Every temp folder a test makes, deleted after the file's tests.
const made: string[] = [];
const temp = (name: string) => {
  const dir = mkdtempSync(join(tmpdir(), `preview-${name}-`));
  made.push(dir);
  return dir;
};
afterAll(() =>
  made.forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);

const mockBundle = join(
  mkdtempSync(join(tmpdir(), "preview-commands-")),
  "main.jsbundle",
);
writeFileSync(mockBundle, "bundle bytes");

jest.mock("../bundle.service", () => ({
  buildBundle: jest.fn(() => ({
    files: [
      {
        absolutePath: mockBundle,
        path: "main.jsbundle",
        sha256: "a".repeat(64),
        size: 12,
      },
    ],
    hermesVersion: 96,
  })),
}));
jest.mock("../../cli/project.service", () => ({
  fingerprint: jest.fn(async () => "fp"),
}));
// A copy is a folder with the app in app/.
jest.mock("../copy.service", () => ({
  prepareCopy: jest.fn(
    ({ dest, platform }: { dest: string; platform: string }) => {
      const { mkdirSync: mkdir } =
        jest.requireActual<typeof import("node:fs")>("node:fs");
      mkdir(`${dest}/app`, { recursive: true });
      return { appDir: `${dest}/app`, env: { COPY: platform } };
    },
  ),
  removeInBackground: jest.fn(),
}));
jest.mock("../file-sets.service", () => ({
  buildFileSets: jest.fn(),
  readFileSets: jest.fn(() => ({ files: [] })),
}));

// One fake bucket: GET, HEAD, PUT with If-Match / If-None-Match, DELETE and ListObjectsV2.
const objects = new Map<string, { body: string; etag: string }>();
let writes = 0;
const bucket = async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  const headers = (init?.headers ?? {}) as Record<string, string>;
  if (url.searchParams.get("list-type") === "2") {
    const prefix = url.searchParams.get("prefix") ?? "";
    const keys = [...objects.keys()].filter((k) => k.startsWith(prefix));
    return new Response(
      `<ListBucketResult>${keys.map((k) => `<Key>${k}</Key>`).join("")}<IsTruncated>false</IsTruncated></ListBucketResult>`,
    );
  }
  const key = decodeURIComponent(url.pathname.replace(/^\/b\//, ""));
  const found = objects.get(key);
  if (method === "PUT") {
    if (headers["if-none-match"] === "*" && found)
      return new Response("", { status: 412 });
    if (headers["if-match"] && headers["if-match"] !== found?.etag)
      return new Response("", { status: 412 });
    objects.set(key, { body: String(init?.body), etag: `"${++writes}"` });
    return new Response("");
  }
  if (method === "DELETE") {
    objects.delete(key);
    return new Response(null, { status: 204 });
  }
  if (!found) return new Response("", { status: 404 });
  return new Response(method === "HEAD" ? null : found.body, {
    headers: { etag: found.etag },
  });
};

const s3 = (slug: string): S3Config => ({
  endpoint: "http://s3.test",
  bucket: "b",
  region: "us-east-1",
  slug,
});

const options = (slug: string, id: string): PublishOptions => ({
  projectRoot: "/app",
  config: { version: "1.0.0" },
  compatibility: "appVersion",
  s3: s3(slug),
  platforms: ["ios"],
  id,
  title: id,
  branch: id,
  commit: "abc",
  author: "Dev",
  changelog: "- a",
  work: temp("run"),
});

const listed = (slug: string) =>
  JSON.parse(objects.get(`${slug}/index/ios/version-1.0.0.json`)!.body)
    .previews as { id: string }[];

const written = () =>
  (process.stdout.write as jest.Mock).mock.calls.map(([text]) => String(text));

beforeEach(() => {
  jest.clearAllMocks();
  objects.clear();
  global.fetch = jest.fn(bucket) as typeof fetch;
  jest.spyOn(process.stdout, "write").mockImplementation(() => true);
});
afterEach(() => jest.restoreAllMocks());

test("two apps in one bucket each keep to their own folder", async () => {
  await publish(options("one", "task-1"));
  await publish(options("two", "task-1"));
  await publish(options("two", "task-2"));
  expect(
    [...objects.keys()].every(
      (k) => k.startsWith("one/") || k.startsWith("two/"),
    ),
  ).toBe(true);
  expect(listed("one").map((p) => p.id)).toEqual(["task-1"]);
  expect(
    listed("two")
      .map((p) => p.id)
      .sort(),
  ).toEqual(["task-1", "task-2"]);

  await unpublish(s3("one"), "task-1");
  expect(listed("one")).toEqual([]);
  expect(
    listed("two")
      .map((p) => p.id)
      .sort(),
  ).toEqual(["task-1", "task-2"]);
  expect(objects.has("two/previews/ios/version-1.0.0/task-1.json")).toBe(true);

  await prune(s3("one"));
  expect(objects.has(`one/files/${"a".repeat(64)}`)).toBe(false);
  expect(objects.has(`two/files/${"a".repeat(64)}`)).toBe(true);
});

test("a list write that landed before the connection dropped is read again, and the preview listed once", async () => {
  const index = "one/index/ios/version-1.0.0.json";
  let puts = 0;
  global.fetch = jest.fn(async (input: string | URL, init?: RequestInit) => {
    const res = await bucket(input, init);
    if (
      init?.method === "PUT" &&
      String(input).endsWith(index) &&
      ++puts === 1
    ) {
      // The bucket kept the write, but the answer never arrived.
      throw Object.assign(new TypeError("fetch failed"), {
        cause: Object.assign(new Error("read ECONNRESET"), {
          code: "ECONNRESET",
        }),
      });
    }
    return res;
  }) as typeof fetch;
  const realSetTimeout = global.setTimeout;
  jest
    .spyOn(global, "setTimeout")
    .mockImplementation(((fn: () => void) =>
      realSetTimeout(fn, 0)) as unknown as typeof setTimeout);

  await publish(options("one", "task-1"));

  // The first try landed, the repeat got 412, and the list was read and written again.
  expect(puts).toBe(3);
  expect(listed("one").map((p) => p.id)).toEqual(["task-1"]);
  const root = JSON.parse(objects.get("one/index.json")!.body);
  expect(root.versions[0].previews.map((p: { id: string }) => p.id)).toEqual([
    "task-1",
  ]);
});

test("says how many files were already in the bucket, and redraws one line in a terminal", async () => {
  const { isTTY, columns } = process.stdout;
  try {
    Object.assign(process.stdout, { isTTY: false });
    await publish(options("one", "task-1"));
    Object.assign(process.stdout, { isTTY: true, columns: 20 });
    await publish(options("one", "task-2"));
  } finally {
    Object.assign(process.stdout, { isTTY, columns });
  }
  expect(written()).toContain("ios: 1 files, 1 new, 0 already in the bucket\n");
  // Drawn when the file starts and again when it is done, cut to the width so it never wraps.
  expect(written()).toContain("\r\x1b[Kios: uploading 0/1 ");
  expect(written()).toContain("\r\x1b[Kios: uploading 1/1 ");
  expect(written()).toContain("ios: 1 files, 0 new, 1 already in the bucket\n");
});

describe("four files at a time", () => {
  const files = Array.from({ length: 45 }, (_, i) => ({
    absolutePath: mockBundle,
    path: `assets/${i}.png`,
    sha256: i.toString(16).padStart(64, "0"),
    size: 100_000,
  }));
  /**
   * The bucket above, answering each file request after `delay(key)` ms and refusing the PUT of
   * `refused`. It counts the file requests open at once and the files asked about.
   */
  const slowly = (delay: (key: string) => number, refused?: string) => {
    const seen = { open: 0, most: 0, puts: [] as string[], asked: new Set() };
    global.fetch = jest.fn(async (input: string | URL, init?: RequestInit) => {
      const key = new URL(String(input)).pathname.replace(/^\/b\/one\//, "");
      if (!key.startsWith("files/")) return bucket(input, init);
      seen.open++;
      seen.most = Math.max(seen.most, seen.open);
      seen.asked.add(key);
      if (init?.method === "PUT") seen.puts.push(key);
      await new Promise((resolve) => setTimeout(resolve, delay(key)));
      seen.open--;
      if (init?.method === "PUT" && key === refused)
        return new Response("", { status: 403 });
      return bucket(input, init);
    }) as typeof fetch;
    return seen;
  };
  const sent = (list: typeof files) => list.map((f) => `files/${f.sha256}`);

  test("never more than four, each new file sent once, a CI line every 20 done, and the summary", async () => {
    // Five are in the bucket from an earlier publish.
    for (const key of sent(files.slice(0, 5)))
      objects.set(`one/${key}`, { body: "x", etag: '"0"' });
    (buildBundle as jest.Mock).mockReturnValueOnce({
      files,
      hermesVersion: 96,
    });
    const seen = slowly(() => 5);
    const { isTTY } = process.stdout;
    try {
      Object.assign(process.stdout, { isTTY: false });
      await publish(options("one", "task-1"));
    } finally {
      Object.assign(process.stdout, { isTTY });
    }

    expect(seen.most).toBe(4);
    expect(seen.puts.sort()).toEqual(sent(files.slice(5)).sort());
    expect(
      written()
        .filter((line) => line.startsWith("ios: uploading"))
        .map((line) => line.split(" (")[0]),
    ).toEqual(["ios: uploading 20/45", "ios: uploading 40/45"]);
    expect(written()).toContainEqual(
      expect.stringMatching(
        /^ios: uploading 20\/45 \(2\.0\/4\.5 MB\) assets\//,
      ),
    );
    expect(written()).toContain(
      "ios: 45 files, 40 new, 5 already in the bucket\n",
    );
  });

  test("after a failure no new file starts, and the ones on the way finish before it throws", async () => {
    const [bad] = sent([files[1]]);
    (buildBundle as jest.Mock).mockReturnValueOnce({
      files,
      hermesVersion: 96,
    });
    // The refused file answers at once, while the three beside it are still on their way.
    const seen = slowly((key) => (key === bad ? 0 : 20), bad);
    let openWhenThrown = -1;
    const failed = publish(options("one", "task-1")).catch((error) => {
      openWhenThrown = seen.open;
      throw error;
    });

    await expect(failed).rejects.toThrow(`S3 403 for ${bad}`);
    expect(openWhenThrown).toBe(0);
    expect([...seen.asked].sort()).toEqual(sent(files.slice(0, 4)).sort());
    expect(objects.has("one/index/ios/version-1.0.0.json")).toBe(false);
  });
});

describe("where it builds", () => {
  const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
    fn as unknown as jest.Mock<ReturnType<T>, Parameters<T>>;
  const both = (extra: Partial<PublishOptions> = {}): PublishOptions => ({
    ...options("one", "task-1"),
    config: {
      version: "1.0.0",
      plugins: [
        [PLUGIN_NAME, { files: { www: { folder: "web", build: "make" } } }],
      ],
    },
    platforms: ["android", "ios"],
    ...extra,
  });

  test("--in-place: no copy, the sets built once for both platforms, everything in the project", async () => {
    await publish(both({ inPlace: true }));
    expect(prepareCopy).not.toHaveBeenCalled();
    expect(mocked(buildFileSets).mock.calls).toEqual([
      [
        "/app",
        expect.anything(),
        expect.objectContaining({ PREVIEW_PUBLISH: "1" }),
      ],
    ]);
    expect(mocked(buildBundle).mock.calls.map(([root]) => root)).toEqual([
      "/app",
      "/app",
    ]);
    expect(written().join("")).not.toContain("copy");
  });

  test("by default: a copy per platform, the sets and the export in it, the fingerprint from the project", async () => {
    const work = temp("run");
    await publish(both({ work, entryFile: "src/main.tsx" }));

    expect(
      mocked(prepareCopy).mock.calls.map(([o]) => [o.dest, o.platform]),
    ).toEqual([
      [join(work, "android"), "android"],
      [join(work, "ios"), "ios"],
    ]);
    expect(
      mocked(buildFileSets).mock.calls.map(([root, , env]) => [root, env]),
    ).toEqual([
      [join(work, "android/app"), { COPY: "android" }],
      [join(work, "ios/app"), { COPY: "ios" }],
    ]);
    expect(mocked(buildBundle).mock.calls).toEqual([
      [
        join(work, "android/app"),
        "android",
        {
          entryFile: join(work, "android/app/src/main.tsx"),
          outDir: join(work, "android-out"),
          env: { COPY: "android" },
        },
      ],
      [
        join(work, "ios/app"),
        "ios",
        {
          entryFile: join(work, "ios/app/src/main.tsx"),
          outDir: join(work, "ios-out"),
          env: { COPY: "ios" },
        },
      ],
    ]);
    expect(mocked(fingerprint).mock.calls).toEqual([
      ["/app", "android"],
      ["/app", "ios"],
    ]);
    // Each copy goes to the background delete once its platform is published, out of the run
    // folder and before the next is made.
    expect(mocked(removeInBackground).mock.calls).toEqual([
      [join(work, "android"), `${work}-android`],
      [join(work, "ios"), `${work}-ios`],
    ]);
    const out = written();
    expect(
      out.indexOf("android: deleting the copy in the background\n"),
    ).toBeLessThan(out.indexOf("\nios: building task-1\n"));
  });

  test("--keep-copy keeps each copy and says where", async () => {
    const work = temp("run");
    await publish(both({ work, keepCopy: true }));
    expect(existsSync(join(work, "android/app"))).toBe(true);
    expect(existsSync(join(work, "ios/app"))).toBe(true);
    expect(removeInBackground).not.toHaveBeenCalled();
    expect(written()).toContain(
      `android: kept the copy at ${join(work, "android")}\n`,
    );
  });

  test("a step in the copy that fails removes it and points at --keep-copy", async () => {
    const work = temp("run");
    mocked(buildBundle).mockImplementationOnce(() => {
      throw new Error("Command failed: node expo/bin/cli export:embed");
    });
    await expect(publish(both({ work }))).rejects.toThrow(
      "Command failed: node expo/bin/cli export:embed\nRun again with --keep-copy to look inside the copy.",
    );
    expect(existsSync(join(work, "android"))).toBe(false);
    expect(written()).toContain("android: removed the copy\n");
    expect(removeInBackground).not.toHaveBeenCalled();
    expect(prepareCopy).toHaveBeenCalledTimes(1);
  });

  test("a failed upload removes the copy too, with no --keep-copy hint", async () => {
    const work = temp("run");
    global.fetch = jest.fn(
      async () => new Response("", { status: 403 }),
    ) as typeof fetch;
    const failed = publish(both({ work }));
    await expect(failed).rejects.toThrow("S3 403");
    await expect(failed).rejects.not.toThrow("--keep-copy");
    expect(existsSync(join(work, "android"))).toBe(false);
    expect(removeInBackground).not.toHaveBeenCalled();
  });

  test("a stop before anything is copied has no --keep-copy hint", async () => {
    mocked(prepareCopy).mockImplementationOnce(() => {
      throw new Error("android: can't install with acme (acme.lock)");
    });
    const failed = publish(both({ work: temp("run") }));
    await expect(failed).rejects.toThrow(
      /^android: can't install with acme \(acme\.lock\)$/,
    );
    expect(buildBundle).not.toHaveBeenCalled();
  });
});
