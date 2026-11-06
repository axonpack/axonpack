import { IndexEntry, Manifest } from "../../../utils/previews/layout.util";
import { sha256Hex } from "../../../utils/s3/sigv4.util";
import { downloadPreview } from "../download.service";
import { disk } from "./fake-file-system.test-helper";
import { listLocalPreviews } from "../local-previews.service";
import { fetchPreviews } from "../remote.service";

jest.mock("expo-file-system", () => require("./fake-file-system.test-helper"));

const config = {
  enabled: true,
  url: "http://localhost:9000/previews-public",
  buildKey: "fp",
  slug: "my-app",
};
const bundle = new TextEncoder().encode("bundle bytes");
const image = new TextEncoder().encode("image bytes");

const manifest = (
  files: { path: string; data: Uint8Array; sha?: string }[],
): Manifest => ({
  schema: 1,
  id: "task-1",
  title: "Task 1",
  branch: "task-1",
  commit: "abc",
  author: "Dev",
  publishedAt: "2026-01-01",
  appVersion: "1.0.0",
  buildNumber: "1",
  platform: "ios",
  compatibility: "fingerprint",
  fingerprint: "fp",
  key: "fp",
  bundle: "main.jsbundle",
  hermesVersion: 99,
  changelog: "- a",
  files: files.map((f) => ({
    path: f.path,
    sha256: f.sha ?? sha256Hex(f.data),
    size: f.data.length,
  })),
});

const entry: IndexEntry = {
  id: "task-1",
  title: "Task 1",
  branch: "task-1",
  commit: "abc",
  author: "Dev",
  publishedAt: "2026-01-01",
  appVersion: "1.0.0",
  buildNumber: "1",
  compatibility: "fingerprint",
  fingerprint: "fp",
  revision: "r1",
  size: 20,
  changelog: "- a",
  manifest: "previews/ios/fp/task-1.json",
};

const serve = (objects: Record<string, unknown>) => {
  const requests: { url: string; headers: Record<string, string> }[] = [];
  global.fetch = jest.fn(async (url: string | URL, init?: RequestInit) => {
    const key = String(url).replace(
      "http://localhost:9000/previews-public/",
      "",
    );
    requests.push({
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    const body = objects[key];
    if (body === undefined) return new Response("", { status: 404 });
    return new Response(
      (body instanceof Uint8Array ? body : JSON.stringify(body)) as BodyInit,
      { status: 200, headers: { etag: '"1"' } },
    );
  }) as typeof fetch;
  return requests;
};

beforeEach(() => disk.clear());

test("downloads every file into <id>/<platform> and records it", async () => {
  serve({
    [`my-app/${entry.manifest}`]: manifest([
      { path: "main.jsbundle", data: bundle },
      { path: "assets/assets/icon.png", data: image },
    ]),
    [`my-app/files/${sha256Hex(bundle)}`]: bundle,
    [`my-app/files/${sha256Hex(image)}`]: image,
  });
  const progress: number[] = [];
  const local = await downloadPreview(config, entry, (p) =>
    progress.push(p.bytes),
  );
  expect(local).toMatchObject({
    id: "task-1",
    platform: "ios",
    key: "fp",
    revision: "r1",
  });
  expect(disk.get("file:/docs/preview/task-1/ios/main.jsbundle")).toEqual(
    bundle,
  );
  expect(
    disk.get("file:/docs/preview/task-1/ios/assets/assets/icon.png"),
  ).toEqual(image);
  expect(progress).toEqual([0, bundle.length, bundle.length + image.length]);
  expect((await listLocalPreviews("ios")).map((p) => p.id)).toEqual(["task-1"]);
});

test("a file that fails its checksum leaves nothing half-done and keeps the old copy", async () => {
  disk.set("file:/docs/preview/task-1/ios", "dir");
  disk.set("file:/docs/preview/task-1/ios/main.jsbundle", bundle);
  serve({
    [`my-app/${entry.manifest}`]: manifest([
      { path: "main.jsbundle", data: bundle, sha: "0".repeat(64) },
    ]),
    [`my-app/files/${"0".repeat(64)}`]: new TextEncoder().encode("tampered"),
  });
  await expect(downloadPreview(config, entry)).rejects.toThrow(
    "did not match its checksum",
  );
  expect([...disk.keys()].some((k) => k.includes("partial"))).toBe(false);
  expect(disk.get("file:/docs/preview/task-1/ios/main.jsbundle")).toEqual(
    bundle,
  );
});

test("asks for this build's list and treats a missing one as empty", async () => {
  serve({});
  const index = await fetchPreviews(config);
  expect(index.previews).toEqual([]);
  expect(index.key).toBe("fp");
});

test("signs requests for a private bucket with the read key", async () => {
  const requests = serve({ "my-app/index/ios/fp.json": { previews: [entry] } });
  const index = await fetchPreviews({
    ...config,
    url: undefined,
    s3Config: {
      url: config.url,
      readAccessKeyId: "reader",
      readSecretAccessKey: "secret",
    },
  });
  expect(index.previews).toHaveLength(1);
  expect(requests[0].url).toBe(
    "http://localhost:9000/previews-public/my-app/index/ios/fp.json",
  );
  expect(requests[0].headers.Authorization).toMatch(
    /^AWS4-HMAC-SHA256 Credential=reader\//,
  );
});

test("says how to fix a build with no compatibility key", async () => {
  await expect(
    fetchPreviews({ ...config, buildKey: undefined }),
  ).rejects.toThrow("config plugins");
});

test("with no list in the slug folder yet, the previews 0.1.0 published outside it show and download from there", async () => {
  const requests = serve({
    "index/ios/fp.json": { previews: [entry] },
    [entry.manifest]: manifest([{ path: "main.jsbundle", data: bundle }]),
    [`files/${sha256Hex(bundle)}`]: bundle,
  });
  const index = await fetchPreviews(config);
  expect(index.previews).toEqual([{ ...entry, withoutSlug: true }]);
  await downloadPreview(config, index.previews[0]);
  expect(disk.get("file:/docs/preview/task-1/ios/main.jsbundle")).toEqual(
    bundle,
  );
  expect(
    requests.map((r) => r.url.replace(/^.*previews-public\//, "")),
  ).toEqual([
    "my-app/index/ios/fp.json",
    "index/ios/fp.json",
    entry.manifest,
    `files/${sha256Hex(bundle)}`,
  ]);
});

test("once the slug folder has a list, the old one outside it is not read", async () => {
  const requests = serve({
    "my-app/index/ios/fp.json": { previews: [] },
    "index/ios/fp.json": { previews: [entry] },
  });
  expect((await fetchPreviews(config)).previews).toEqual([]);
  expect(requests).toHaveLength(1);
});

test("a read key limited to the slug folder still gets an empty list, not an error", async () => {
  global.fetch = jest.fn(
    async (url: string | URL) =>
      new Response("", {
        status: String(url).includes("/my-app/") ? 404 : 403,
      }),
  ) as typeof fetch;
  const index = await fetchPreviews({
    ...config,
    url: undefined,
    s3Config: {
      url: config.url,
      readAccessKeyId: "reader",
      readSecretAccessKey: "secret",
    },
  });
  expect(index.previews).toEqual([]);
});

test("reads nothing without the app's slug, since it can't tell its own folder", async () => {
  const requests = serve({});
  await expect(fetchPreviews({ ...config, slug: undefined })).rejects.toThrow(
    "no app slug",
  );
  expect(requests).toEqual([]);
});

describe("file sets", () => {
  const page = new TextEncoder().encode("<p>web</p>");
  const withSet = () =>
    serve({
      [`my-app/${entry.manifest}`]: {
        ...manifest([
          { path: "main.jsbundle", data: bundle },
          { path: "files/www/index.html", data: page },
        ]),
        fileSets: { www: { files: 1, size: page.length } },
      },
      [`my-app/files/${sha256Hex(bundle)}`]: bundle,
      [`my-app/files/${sha256Hex(page)}`]: page,
    });
  const WWW = "file:/docs/preview/task-1/ios/files/www";

  test("come down with the bundle into files/<name>/, then onPostDownload runs once on the final folder", async () => {
    withSet();
    const onPostDownload = jest.fn(async (_name: string, uri: string) => {
      // The files are already in place when it runs.
      expect(disk.get(`${uri}index.html`)).toEqual(page);
    });
    await downloadPreview(
      {
        ...config,
        files: { www: { default: "file:///www/", onPostDownload } },
      },
      entry,
    );
    expect(disk.get(`${WWW}/index.html`)).toEqual(page);
    expect(onPostDownload).toHaveBeenCalledTimes(1);
    expect(onPostDownload).toHaveBeenCalledWith("www", `${WWW}/`, {
      previousUri: undefined,
    });
    // Recorded, so a start after the app's folder moved can tell.
    const [local] = await listLocalPreviews("ios");
    expect(local.onPostDownloadUris).toEqual({ www: `${WWW}/` });
  });

  test("a set file that fails its checksum fails the whole download", async () => {
    serve({
      [`my-app/${entry.manifest}`]: manifest([
        { path: "main.jsbundle", data: bundle },
        { path: "files/www/index.html", data: page, sha: "0".repeat(64) },
      ]),
      [`my-app/files/${sha256Hex(bundle)}`]: bundle,
      [`my-app/files/${"0".repeat(64)}`]: page,
    });
    await expect(downloadPreview(config, entry)).rejects.toThrow(
      "files/www/index.html did not match its checksum",
    );
    expect(disk.has("file:/docs/preview/task-1/ios")).toBe(false);
  });

  test("an onPostDownload that throws leaves no download behind", async () => {
    withSet();
    const onPostDownload = () => {
      throw new Error("rewrite failed");
    };
    await expect(
      downloadPreview(
        {
          ...config,
          files: { www: { default: "file:///www/", onPostDownload } },
        },
        entry,
      ),
    ).rejects.toThrow("rewrite failed");
    expect(disk.has("file:/docs/preview/task-1/ios")).toBe(false);
    expect(await listLocalPreviews("ios")).toEqual([]);
  });

  test("an app that doesn't list the set still downloads it, and nothing runs", async () => {
    withSet();
    await downloadPreview(config, entry);
    expect(disk.get(`${WWW}/index.html`)).toEqual(page);
  });
});

describe("four files at a time", () => {
  const files = Array.from({ length: 10 }, (_, i) => ({
    path: `files/www/${i}.js`,
    data: new TextEncoder().encode(`file ${i}`),
  }));
  /** Serves each file after `delay(key)` ms, counting the requests open at once. */
  const serveSlowly = (
    objects: Record<string, unknown>,
    delay: (key: string) => number,
  ) => {
    let open = 0;
    const seen = { most: 0 };
    global.fetch = jest.fn(async (url: string | URL) => {
      const key = String(url).replace(
        "http://localhost:9000/previews-public/",
        "",
      );
      open++;
      seen.most = Math.max(seen.most, open);
      await new Promise((resolve) => setTimeout(resolve, delay(key)));
      open--;
      const body = objects[key];
      if (body === undefined) return new Response("", { status: 404 });
      return new Response(
        (body instanceof Uint8Array ? body : JSON.stringify(body)) as BodyInit,
        { status: 200 },
      );
    }) as typeof fetch;
    return seen;
  };
  const objectsFor = (
    list: { path: string; data: Uint8Array; sha?: string }[],
  ) => ({
    [`my-app/${entry.manifest}`]: manifest(list),
    ...Object.fromEntries(
      list.map((f) => [`my-app/files/${f.sha ?? sha256Hex(f.data)}`, f.data]),
    ),
  });

  test("never more than four, and every file lands checked", async () => {
    const seen = serveSlowly(objectsFor(files), () => 5);
    await downloadPreview(config, entry);
    expect(seen.most).toBe(4);
    for (const f of files)
      expect(disk.get(`file:/docs/preview/task-1/ios/${f.path}`)).toEqual(
        f.data,
      );
  });

  test("a failure waits for the downloads on the way, then leaves no folder behind", async () => {
    const bad = { ...files[1], sha: "0".repeat(64) };
    const list = [files[0], bad, ...files.slice(2)];
    // The bad file answers at once, while the three beside it are still on their way.
    serveSlowly(objectsFor(list), (key) =>
      key.endsWith("0".repeat(64)) ? 0 : 20,
    );
    await expect(downloadPreview(config, entry)).rejects.toThrow(
      "files/www/1.js did not match its checksum",
    );
    // Let anything still running finish, as it would on a device.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect([...disk.keys()].filter((k) => k.includes("task-1/"))).toEqual([]);
  });
});
