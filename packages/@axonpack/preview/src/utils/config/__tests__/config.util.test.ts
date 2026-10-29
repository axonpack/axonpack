import { toS3Config } from "../config.util";
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
      /No bucket URL\. Set `url` in the preview config/,
    );
  }
});

test("a relative bucket URL says it is not a full address", () => {
  for (const url of ["/previews", "localhost:9000/previews"]) {
    expect(() => toS3Config({ enabled: true, url })).toThrow(
      /is not a full address\. Set `url` in the preview config/,
    );
  }
});
