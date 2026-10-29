import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ENV, readConfig } from "../config.service";

// The real @expo/env, from this package's own expo, since a temp project has no node_modules.
jest.mock("../project.service", () => ({
  appRequire: () =>
    jest
      .requireActual<typeof import("node:module")>("node:module")
      .createRequire(require.resolve("expo/package.json")),
}));

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
    "PREVIEW_S3_ACCESS_KEY_ID, PREVIEW_S3_SECRET_ACCESS_KEY",
  );
});

describe("the env files", () => {
  const project = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), "preview-config-"));
    for (const [name, content] of Object.entries(files))
      writeFileSync(join(dir, name), content);
    return dir;
  };
  const lines = (bucket: string) =>
    `${ENV.url}=http://localhost:9000/${bucket}\n${ENV.accessKeyId}=k\n${ENV.secretAccessKey}=s\n`;
  const bucketOf = (files: Record<string, string>, env = {}) =>
    readConfig(project(files), env).bucket;

  test("are the ones a release bundle loads, picked in Expo's order", () => {
    const all = {
      ".env": lines("env"),
      ".env.production": lines("env-production"),
      ".env.local": lines("env-local"),
      ".env.production.local": lines("env-production-local"),
      ".env.development.local": lines("env-development-local"),
      ".env.preview": lines("env-preview"),
    };
    const order = [
      ".env.production.local",
      ".env.local",
      ".env.production",
      ".env",
    ];
    for (const [i, file] of order.entries()) {
      const files = Object.fromEntries(
        Object.entries(all).filter(
          ([name]) => !order.slice(0, i).includes(name),
        ),
      );
      expect(bucketOf(files)).toBe(file.slice(1).replaceAll(".", "-"));
    }
    expect(() =>
      bucketOf({
        ".env.preview": lines("env-preview"),
        ".env.development.local": lines("dev"),
      }),
    ).toThrow(ENV.url);
  });

  test("expand variables the way Expo does", () => {
    expect(
      bucketOf({
        ".env.local": `BUCKET=expanded\n${ENV.url}=http://localhost:9000/\${BUCKET}\n${ENV.accessKeyId}=k\n${ENV.secretAccessKey}=s\n`,
      }),
    ).toBe("expanded");
  });

  test("lose to the environment, which also holds the EAS values under the shell's", () => {
    expect(
      bucketOf(
        { ".env.local": lines("from-file") },
        { [ENV.url]: "http://localhost:9000/from-env" },
      ),
    ).toBe("from-env");
  });

  test("missing settings name the variables and where to put them", () => {
    expect(() => bucketOf({ ".env": `${ENV.url}=http://x/b\n` })).toThrow(
      /PREVIEW_S3_ACCESS_KEY_ID, PREVIEW_S3_SECRET_ACCESS_KEY in the environment \(CI secrets\), or locally in .*\.env\.local/,
    );
  });

  test("never take EXPO_PUBLIC_ values for the write key", () => {
    expect(() =>
      bucketOf({
        ".env": `EXPO_PUBLIC_${ENV.url}=http://localhost:9000/app\n`,
      }),
    ).toThrow(ENV.url);
  });
});
