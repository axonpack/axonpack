import { getJson, objectUrl, parseBucketUrl, putObject, S3Config } from "./s3";

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

test("with no bucket the endpoint is the base every key goes under", () => {
  expect(
    objectUrl({ endpoint: "https://pub.r2.dev/", region: "auto" }, "a b/c"),
  ).toBe("https://pub.r2.dev/a%20b/c");
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

describe("bucket URLs with or without slashes", () => {
  const base = {
    endpoint: "https://acct.r2.dev:9000",
    bucket: "b",
    prefix: undefined,
  };
  test.each([
    "https://acct.r2.dev:9000/b",
    "https://acct.r2.dev:9000/b/",
    "https://acct.r2.dev:9000//b//",
    " HTTPS://acct.r2.dev:9000/b ",
  ])("%s", (value) => {
    expect(parseBucketUrl(value)).toEqual({
      ...base,
      endpoint: base.endpoint.replace("HTTPS", "https"),
    });
  });

  test.each([
    "http://h:9/b/app/v1",
    "http://h:9/b/app/v1/",
    "http://h:9/b//app//v1//",
  ])("keeps the folder: %s", (value) => {
    const config = { ...parseBucketUrl(value), region: "us-east-1" };
    expect(config.prefix).toBe("app/v1");
    expect(objectUrl(config, "index.json")).toBe(
      "http://h:9/b/app/v1/index.json",
    );
  });

  test("says what is wrong with a value that is not a bucket URL", () => {
    expect(() => parseBucketUrl("localhost:9000/b")).toThrow("is not a URL");
    expect(() => parseBucketUrl("http://localhost:9000/")).toThrow(
      "has no bucket",
    );
  });
});

test("a login page instead of JSON says where it came from", async () => {
  const page = new Response(
    "<!DOCTYPE html><html><body>Sign in with GitHub</body></html>",
    {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
  Object.defineProperty(page, "url", {
    value: "https://global.rel.tunnels.example/auth/github",
  });
  global.fetch = jest.fn(async () => page) as typeof fetch;
  await expect(
    getJson(
      { ...config, endpoint: "https://tunnel.example" },
      "index/android/fp.json",
    ),
  ).rejects.toThrow(
    "Expected JSON from https://tunnel.example/b/index/android/fp.json but got text/html (status 200, redirected to https://global.rel.tunnels.example/auth/github). Is the URL public",
  );
});

test("without a content type, the start of the body is shown", async () => {
  global.fetch = jest.fn(async () => {
    const res = new Response("not json at all");
    res.headers.delete("content-type");
    return res;
  }) as typeof fetch;
  await expect(getJson(config, "index.json")).rejects.toThrow(
    'but got "not json at all" (status 200)',
  );
});
