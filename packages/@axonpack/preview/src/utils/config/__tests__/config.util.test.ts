import {
  bucketSettings,
  devServersSetup,
  previewsConfigured,
  toS3Config,
} from "../config.util";
import { objectUrl } from "../../../services/s3/s3.service";

const read = (url: string, key = "index/ios/fp.json") =>
  objectUrl(toS3Config({ enabled: true, url }), key);

test("with no read key the URL is a plain base, with or without a slash at the end", () => {
  for (const url of [
    "http://localhost:9000/previews-public",
    "http://localhost:9000/previews-public/",
  ]) {
    // The same address the bucket parsing gave before, for a public MinIO bucket.
    expect(read(url)).toBe(
      "http://localhost:9000/previews-public/index/ios/fp.json",
    );
  }
  expect(toS3Config({ enabled: true, url: "http://h/b" }).credentials).toBe(
    undefined,
  );
});

test("an r2.dev or CDN address works with no bucket in it", () => {
  expect(read("https://pub-123.r2.dev")).toBe(
    "https://pub-123.r2.dev/index/ios/fp.json",
  );
  expect(read("https://cdn.example.com/previews/my-app/")).toBe(
    "https://cdn.example.com/previews/my-app/index/ios/fp.json",
  );
});

test("a read key makes the app sign its reads, and only both halves count", () => {
  const signed = toS3Config({
    enabled: true,
    url: "http://localhost:9000/previews-private/my-app/",
    readAccessKeyId: "reader",
    readSecretAccessKey: "secret",
    region: "auto",
  });
  expect(signed).toMatchObject({
    endpoint: "http://localhost:9000",
    bucket: "previews-private",
    prefix: "my-app",
    region: "auto",
    credentials: { accessKeyId: "reader", secretAccessKey: "secret" },
  });
  expect(objectUrl(signed, "index.json")).toBe(
    "http://localhost:9000/previews-private/my-app/index.json",
  );
  expect(
    toS3Config({ enabled: true, url: "http://h/b", readAccessKeyId: "x" })
      .credentials,
  ).toBeUndefined();
  expect(
    toS3Config({
      enabled: true,
      url: "http://h/b",
      readAccessKeyId: "x",
      readSecretAccessKey: "y",
    }).region,
  ).toBe("us-east-1");
});

test("extra headers go with every read", async () => {
  const seen: Record<string, string>[] = [];
  global.fetch = jest.fn(async (_url, init) => {
    seen.push((init as RequestInit).headers as Record<string, string>);
    return new Response("{}");
  }) as typeof fetch;
  const { getJson } = require("../../../services/s3/s3.service");
  await getJson(
    toS3Config({
      enabled: true,
      url: "http://h/b",
      headers: { "X-Tunnel-Skip-AntiPhishing-Page": "True" },
    }),
    "index.json",
  );
  expect(seen[0]["X-Tunnel-Skip-AntiPhishing-Page"]).toBe("True");
});

test("an empty bucket URL names the setting instead of failing on the path", () => {
  for (const url of ["", "  "]) {
    expect(() => toS3Config({ enabled: true, url })).toThrow(
      /No bucket URL\. Set `s3Config\.url` in the preview config/,
    );
  }
});

test("a relative bucket URL says it is not a full address", () => {
  for (const url of ["/previews", "localhost:9000/previews"]) {
    expect(() => toS3Config({ enabled: true, url })).toThrow(
      /is not a full address\. Set `s3Config\.url` in the preview config/,
    );
  }
});

describe("s3Config", () => {
  const bucket = {
    url: "http://localhost:9000/previews-private",
    readAccessKeyId: "reader",
    readSecretAccessKey: "secret",
    region: "auto",
    headers: { "X-Tunnel-Skip-AntiPhishing-Page": "True" },
  };

  test("is read as given", () => {
    expect(bucketSettings({ enabled: true, s3Config: bucket })).toEqual(bucket);
  });

  test("the flat fields of 0.1.0 still work", () => {
    expect(bucketSettings({ enabled: true, ...bucket })).toEqual(bucket);
  });

  test("wins over the flat fields, with one warning per run", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const both = { enabled: true, s3Config: bucket, url: "http://old/b" };
    expect(bucketSettings(both)).toBe(bucket);
    expect(toS3Config(both).bucket).toBe("previews-private");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/Using `s3Config`/);
    warn.mockRestore();
  });

  test("with neither, the missing URL names s3Config.url", () => {
    expect(bucketSettings({ enabled: true }).url).toBe("");
    expect(() => toS3Config({ enabled: true })).toThrow(
      /No bucket URL\. Set `s3Config\.url` in the preview config/,
    );
  });
});

describe("previewsConfigured", () => {
  test("no s3Config, or an undefined, empty or blank URL, is not configured", () => {
    expect(previewsConfigured({ enabled: true })).toBe(false);
    // What an unset env value gives, passed straight in.
    for (const url of [undefined, "", "  "])
      expect(previewsConfigured({ enabled: true, s3Config: { url } })).toBe(
        false,
      );
  });

  test("a URL in s3Config is configured, even a bad one, which still errors on a read", () => {
    expect(
      previewsConfigured({ enabled: true, s3Config: { url: "http://h/b" } }),
    ).toBe(true);
    expect(
      previewsConfigured({ enabled: true, s3Config: { url: "/previews" } }),
    ).toBe(true);
  });

  test("the old flat url follows the same rule", () => {
    expect(previewsConfigured({ enabled: true, url: "" })).toBe(false);
    expect(previewsConfigured({ enabled: true, url: "http://h/b" })).toBe(true);
  });
});

describe("devPreviewServers", () => {
  const off = {
    enabled: false,
    allowCustomHosts: true,
    hosts: [],
    skipped: [],
  };

  test("left out or false is off", () => {
    expect(devServersSetup(undefined)).toEqual(off);
    expect(devServersSetup(false)).toEqual(off);
  });

  test("true is on, with Add a host and no hosts of the app's own", () => {
    expect(devServersSetup(true)).toEqual({ ...off, enabled: true });
  });

  test("an object is on unless it says otherwise", () => {
    expect(devServersSetup({}).enabled).toBe(true);
    expect(devServersSetup({ enabled: false }).enabled).toBe(false);
    expect(devServersSetup({ allowCustomHosts: false })).toMatchObject({
      enabled: true,
      allowCustomHosts: false,
    });
  });

  test("the app's hosts are read, and bad ones left out with why", () => {
    expect(
      devServersSetup({
        hosts: [
          "192.168.1.24",
          "qa-mac.local:19151",
          "not a host",
          "localhost",
          "192.168.1.24:19150",
        ],
      }),
    ).toEqual({
      enabled: true,
      allowCustomHosts: true,
      hosts: [
        { host: "192.168.1.24", port: 19150 },
        { host: "qa-mac.local", port: 19151 },
      ],
      skipped: [
        { text: "not a host", problem: "invalid" },
        { text: "localhost", problem: "builtIn" },
        { text: "192.168.1.24:19150", problem: "duplicate" },
      ],
    });
  });
});
