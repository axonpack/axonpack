import { IndexEntry, Manifest } from "./core/layout";
import { sha256Hex } from "./core/sigv4";
import { downloadPreview } from "./download";
import { disk } from "./fake-file-system.test-helper";
import { listLocalPreviews } from "./local";
import { fetchPreviews } from "./remote";

jest.mock("expo-file-system", () => require("./fake-file-system.test-helper"));

const config = {
  enabled: true,
  url: "http://localhost:9000/previews-public",
  fingerprint: "fp",
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
  fingerprint: "fp",
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
    [entry.manifest]: manifest([
      { path: "main.jsbundle", data: bundle },
      { path: "assets/assets/icon.png", data: image },
    ]),
    [`files/${sha256Hex(bundle)}`]: bundle,
    [`files/${sha256Hex(image)}`]: image,
  });
  const progress: number[] = [];
  const local = await downloadPreview(config, entry, (p) =>
    progress.push(p.bytes),
  );
  expect(local).toMatchObject({
    id: "task-1",
    platform: "ios",
    fingerprint: "fp",
    revision: "r1",
  });
  expect(disk.get("file:/docs/preview-ready/task-1/ios/main.jsbundle")).toEqual(
    bundle,
  );
  expect(
    disk.get("file:/docs/preview-ready/task-1/ios/assets/assets/icon.png"),
  ).toEqual(image);
  expect(progress).toEqual([0, bundle.length, bundle.length + image.length]);
  expect((await listLocalPreviews("ios")).map((p) => p.id)).toEqual(["task-1"]);
});

test("a file that fails its checksum leaves nothing half-done and keeps the old copy", async () => {
  disk.set("file:/docs/preview-ready/task-1/ios", "dir");
  disk.set("file:/docs/preview-ready/task-1/ios/main.jsbundle", bundle);
  serve({
    [entry.manifest]: manifest([
      { path: "main.jsbundle", data: bundle, sha: "0".repeat(64) },
    ]),
    [`files/${"0".repeat(64)}`]: new TextEncoder().encode("tampered"),
  });
  await expect(downloadPreview(config, entry)).rejects.toThrow(
    "did not match its checksum",
  );
  expect([...disk.keys()].some((k) => k.includes("partial"))).toBe(false);
  expect(disk.get("file:/docs/preview-ready/task-1/ios/main.jsbundle")).toEqual(
    bundle,
  );
});

test("asks for this build's list and treats a missing one as empty", async () => {
  serve({});
  const index = await fetchPreviews(config);
  expect(index.previews).toEqual([]);
  expect(index.fingerprint).toBe("fp");
});

test("signs requests for a private bucket with the read key", async () => {
  const requests = serve({ "index/ios/fp.json": { previews: [entry] } });
  const index = await fetchPreviews({
    ...config,
    readAccessKeyId: "reader",
    readSecretAccessKey: "secret",
  });
  expect(index.previews).toHaveLength(1);
  expect(requests[0].url).toBe(
    "http://localhost:9000/previews-public/index/ios/fp.json",
  );
  expect(requests[0].headers.Authorization).toMatch(
    /^AWS4-HMAC-SHA256 Credential=reader\//,
  );
});

test("says how to fix a build with no fingerprint", async () => {
  await expect(
    fetchPreviews({ ...config, fingerprint: undefined }),
  ).rejects.toThrow("config plugins");
});
