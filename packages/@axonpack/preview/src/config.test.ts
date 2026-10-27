import { toS3Config } from "./config";
import { objectUrl, readUrl } from "./core/s3";

test("the app's URL means the same with or without a slash at the end", () => {
  const configs = [
    "http://localhost:9000/previews-public",
    "http://localhost:9000/previews-public/",
  ].map((url) => toS3Config({ enabled: true, url }));
  expect(configs[0]).toEqual(configs[1]);
  expect(readUrl(configs[1], "index/ios/fp.json")).toBe(
    "http://localhost:9000/previews-public/index/ios/fp.json",
  );
});

test("a read key makes the app sign its reads, and only both halves count", () => {
  const signed = toS3Config({
    enabled: true,
    url: "http://localhost:9000/previews-private/",
    readAccessKeyId: "reader",
    readSecretAccessKey: "secret",
  });
  expect(signed.credentials).toEqual({
    accessKeyId: "reader",
    secretAccessKey: "secret",
  });
  expect(objectUrl(signed, "index.json")).toBe(
    "http://localhost:9000/previews-private/index.json",
  );
  expect(
    toS3Config({ enabled: true, url: "http://h/b", readAccessKeyId: "x" })
      .credentials,
  ).toBeUndefined();
});

test("extra headers go with every read", async () => {
  const seen: Record<string, string>[] = [];
  global.fetch = jest.fn(async (_url, init) => {
    seen.push((init as RequestInit).headers as Record<string, string>);
    return new Response("{}");
  }) as typeof fetch;
  const { getJson } = require("./core/s3");
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
