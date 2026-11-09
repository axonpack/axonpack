import {
  exists,
  getJson,
  listKeys,
  objectUrl,
  parseBucketUrl,
  putObject,
  S3Config,
  S3Error,
} from "../s3.service";

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

describe("the app's slug folder", () => {
  test("every key goes under it", () => {
    expect(objectUrl({ ...config, slug: "my-app" }, "index.json")).toBe(
      "http://localhost:9000/b/my-app/index.json",
    );
    expect(
      objectUrl(
        { endpoint: "https://pub.r2.dev", region: "auto", slug: "my-app" },
        "files/abc",
      ),
    ).toBe("https://pub.r2.dev/my-app/files/abc");
  });

  test("a folder from the URL still goes in front of it", () => {
    const parts = parseBucketUrl("http://localhost:9000/b/old-folder");
    expect(
      objectUrl(
        { ...parts, region: "us-east-1", slug: "my-app" },
        "index.json",
      ),
    ).toBe("http://localhost:9000/b/old-folder/my-app/index.json");
  });

  test("a listing asks only inside it and returns keys relative to it", async () => {
    const urls: string[] = [];
    global.fetch = jest.fn(async (url) => {
      urls.push(String(url));
      return new Response(
        "<ListBucketResult><Key>old/my-app/files/a</Key><Key>old/my-app/files/b</Key><IsTruncated>false</IsTruncated></ListBucketResult>",
      );
    }) as typeof fetch;
    await expect(
      listKeys({ ...config, prefix: "old", slug: "my-app" }, "files/"),
    ).resolves.toEqual(["files/a", "files/b"]);
    expect(decodeURIComponent(urls[0])).toContain("prefix=old/my-app/files/");
  });
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

describe("when fetch throws", () => {
  // Node's fetch throws "fetch failed" and puts what happened on `cause`.
  const networkError = (code: string, message: string) =>
    Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error(message), { code }),
    });
  const delays: number[] = [];
  const realSetTimeout = global.setTimeout;

  beforeEach(() => {
    delays.length = 0;
    jest.spyOn(global, "setTimeout").mockImplementation(((
      fn: () => void,
      ms?: number,
    ) => {
      delays.push(ms ?? 0);
      return realSetTimeout(fn, 0);
    }) as unknown as typeof setTimeout);
  });
  afterEach(() => jest.restoreAllMocks());

  test("the error names the method, the key and the cause", async () => {
    const thrown = networkError(
      "ENOTFOUND",
      "getaddrinfo ENOTFOUND minio.example",
    );
    global.fetch = jest.fn(async () => {
      throw thrown;
    }) as typeof fetch;
    const error = (await exists(config, "files/abc").catch((e) => e)) as Error;
    expect(error.message).toBe(
      "HEAD files/abc failed: ENOTFOUND getaddrinfo ENOTFOUND minio.example",
    );
    expect(error.cause).toBe(thrown);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("without a cause code, as in the app, it keeps fetch's message and doesn't retry", async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError("Network request failed");
    }) as typeof fetch;
    await expect(getJson(config, "index.json")).rejects.toThrow(
      "GET index.json failed: Network request failed",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("a dropped connection is tried again, and the answer is used", async () => {
    let calls = 0;
    global.fetch = jest.fn(async () => {
      if (++calls < 3) throw networkError("ECONNRESET", "read ECONNRESET");
      return new Response("");
    }) as typeof fetch;
    await expect(putObject(config, "files/abc", "bytes")).resolves.toBe(true);
    expect(calls).toBe(3);
    expect(delays).toEqual([1000, 2000]);
  });

  test("it gives up after 4 tries and says so", async () => {
    global.fetch = jest.fn(async () => {
      throw networkError(
        "ECONNREFUSED",
        "connect ECONNREFUSED 51.200.6.248:9000",
      );
    }) as typeof fetch;
    await expect(putObject(config, "files/abc", "bytes")).rejects.toThrow(
      "PUT files/abc failed after 4 tries: ECONNREFUSED connect ECONNREFUSED 51.200.6.248:9000",
    );
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  test("an HTTP error status is never retried", async () => {
    global.fetch = jest.fn(
      async () => new Response("SlowDown", { status: 503 }),
    ) as typeof fetch;
    await expect(putObject(config, "files/abc", "bytes")).rejects.toThrow(
      S3Error,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });
});
