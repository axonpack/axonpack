import { ENV, readConfig } from "./config";

const full = {
  [ENV.endpoint]: "http://localhost:9000",
  [ENV.bucket]: "previews-public",
  [ENV.accessKeyId]: "key",
  [ENV.secretAccessKey]: "secret",
};

test("reads the bucket and write key, with us-east-1 as the default region", () => {
  expect(readConfig("/nowhere", full)).toEqual({
    endpoint: "http://localhost:9000",
    bucket: "previews-public",
    region: "us-east-1",
    credentials: { accessKeyId: "key", secretAccessKey: "secret" },
    publicUrl: undefined,
  });
});

test("names every missing variable", () => {
  expect(() => readConfig("/nowhere", { [ENV.endpoint]: "x" })).toThrow(
    "PREVIEW_READY_S3_BUCKET, PREVIEW_READY_S3_ACCESS_KEY_ID, PREVIEW_READY_S3_SECRET_ACCESS_KEY",
  );
});
