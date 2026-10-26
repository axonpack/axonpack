import { objectUrl, parseBucketUrl, putObject, readUrl, S3Config } from "./s3";

const config: S3Config = {
  endpoint: "http://localhost:9000/",
  bucket: "b",
  region: "us-east-1",
};

test("builds path-style URLs and keeps slashes in keys", () => {
  expect(objectUrl(config, "files/abc")).toBe(
    "http://localhost:9000/b/files/abc",
  );
});

test("splits <endpoint>/<bucket>/<prefix> and puts keys under the prefix", () => {
  const parts = parseBucketUrl("http://localhost:9000/b/app/one");
  expect(parts).toEqual({
    endpoint: "http://localhost:9000",
    bucket: "b",
    prefix: "app/one",
  });
  expect(objectUrl({ ...parts, region: "us-east-1" }, "index.json")).toBe(
    "http://localhost:9000/b/app/one/index.json",
  );
  expect(() => parseBucketUrl("http://localhost:9000")).toThrow(
    "has no bucket",
  );
});

test("public reads use the public URL only for an unsigned bucket", () => {
  const pub = { ...config, publicUrl: "https://pub.r2.dev/" };
  expect(readUrl(pub, "index.json")).toBe("https://pub.r2.dev/index.json");
  const signed = {
    ...pub,
    credentials: { accessKeyId: "k", secretAccessKey: "s" },
  };
  expect(readUrl(signed, "index.json")).toBe(
    "http://localhost:9000/b/index.json",
  );
});

test("a failed condition reports false so the caller can retry", async () => {
  const calls: RequestInit[] = [];
  global.fetch = jest.fn(async (_url, init) => {
    calls.push(init as RequestInit);
    return new Response("", { status: 412 });
  }) as typeof fetch;
  await expect(
    putObject(config, "index.json", "{}", { etag: '"abc"' }),
  ).resolves.toBe(false);
  expect((calls[0].headers as Record<string, string>)["if-match"]).toBe(
    '"abc"',
  );
  await putObject(config, "index.json", "{}", { etag: null });
  expect((calls[1].headers as Record<string, string>)["if-none-match"]).toBe(
    "*",
  );
});
