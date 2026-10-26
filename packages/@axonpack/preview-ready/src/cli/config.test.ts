import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ENV, ENV_FILE, readConfig } from "./config";

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

describe("the settings file", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  const project = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), "preview-ready-config-"));
    for (const [name, content] of Object.entries(files))
      writeFileSync(join(dir, name), content);
    return dir;
  };
  const lines = `${ENV.url}=http://localhost:9000/from-file\n${ENV.accessKeyId}=k\n${ENV.secretAccessKey}=s\n`;

  test(`is ${ENV_FILE}, and a real environment variable wins over it`, () => {
    process.env[ENV.url] = "http://localhost:9000/from-env";
    expect(readConfig(project({ [ENV_FILE]: lines })).bucket).toBe("from-env");
  });

  test("never comes from the app's .env or its EXPO_PUBLIC_ values", () => {
    const dir = project({
      ".env": `${lines}EXPO_PUBLIC_PREVIEW_READY_S3_URL=http://localhost:9000/app\n`,
    });
    expect(() => readConfig(dir)).toThrow(ENV_FILE);
  });
});
