import { ENV, readConfig } from "./config";

const full = {
  [ENV.url]: "http://localhost:9000/previews-public",
  [ENV.accessKeyId]: "key",
  [ENV.secretAccessKey]: "secret",
};

test("one URL gives the endpoint and bucket, and us-east-1 is the default region", () => {
  expect(readConfig("/nowhere", full)).toEqual({
    endpoint: "http://localhost:9000",
    bucket: "previews-public",
    prefix: undefined,
    region: "us-east-1",
    credentials: {
      accessKeyId: "key",
      secretAccessKey: "secret",
      sessionToken: undefined,
    },
    publicUrl: undefined,
  });
});

test("extra path segments become a folder inside the bucket, and the region setting is honoured", () => {
  const config = readConfig("/nowhere", {
    ...full,
    [ENV.url]: "https://acct.r2.cloudflarestorage.com/previews/my-app/",
    [ENV.region]: "auto",
  });
  expect(config).toMatchObject({
    bucket: "previews",
    prefix: "my-app",
    region: "auto",
  });
});

test("names every missing variable", () => {
  expect(() => readConfig("/nowhere", { [ENV.url]: "http://x/b" })).toThrow(
    "PREVIEW_READY_S3_ACCESS_KEY_ID, PREVIEW_READY_S3_SECRET_ACCESS_KEY",
  );
});
