import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { S3Config } from "../../s3/s3.service";
import { PublishOptions, prune, publish, unpublish } from "../commands.service";

const mockBundle = join(
  mkdtempSync(join(tmpdir(), "preview-commands-")),
  "main.jsbundle",
);
writeFileSync(mockBundle, "bundle bytes");

jest.mock("../bundle.service", () => ({
  buildBundle: () => ({
    files: [
      {
        absolutePath: mockBundle,
        path: "main.jsbundle",
        sha256: "a".repeat(64),
        size: 12,
      },
    ],
    hermesVersion: 96,
  }),
}));
jest.mock("../../cli/project.service", () => ({
  fingerprint: async () => "fp",
}));

// One fake bucket: GET, HEAD, PUT with If-Match / If-None-Match, DELETE and ListObjectsV2.
const objects = new Map<string, { body: string; etag: string }>();
let writes = 0;
global.fetch = jest.fn(async (input: string | URL, init?: RequestInit) => {
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
}) as typeof fetch;

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
});

const listed = (slug: string) =>
  JSON.parse(objects.get(`${slug}/index/ios/version-1.0.0.json`)!.body)
    .previews as { id: string }[];

beforeEach(() => {
  objects.clear();
  jest.spyOn(process.stdout, "write").mockImplementation(() => true);
});

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
