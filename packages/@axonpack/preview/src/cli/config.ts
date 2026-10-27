import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

import { DEFAULT_REGION, S3Config, parseBucketUrl } from "../core/s3";

export const ENV = {
  url: "PREVIEW_S3_URL",
  accessKeyId: "PREVIEW_S3_ACCESS_KEY_ID",
  secretAccessKey: "PREVIEW_S3_SECRET_ACCESS_KEY",
  region: "PREVIEW_S3_REGION",
  publicUrl: "PREVIEW_S3_PUBLIC_URL",
} as const;

/**
 * The publish settings' own file. Not `.env`: Expo loads `.env`, `.env.local` and `.env.<mode>`
 * into the bundler's environment, and the write key must never get near an app build.
 */
export const ENV_FILE = ".env.preview";

/**
 * Reads where to publish and the write key from `.env.preview` in the app's root, then the
 * environment. A variable already set in the environment wins over the file, so CI can pass its
 * secrets without one. Nothing else is read: not `.env`, not `EXPO_PUBLIC_*`.
 */
export function readConfig(
  projectRoot: string,
  env: Record<string, string | undefined> = process.env,
): S3Config {
  const file = join(projectRoot, ENV_FILE);
  const fromFile = existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
  env = { ...fromFile, ...env };
  const missing = [ENV.url, ENV.accessKeyId, ENV.secretAccessKey].filter(
    (name) => !env[name],
  );
  if (missing.length > 0) {
    throw new Error(
      `Set ${missing.join(", ")} in ${file} or in the environment.`,
    );
  }
  return {
    ...parseBucketUrl(env[ENV.url]!),
    region: env[ENV.region] || DEFAULT_REGION,
    credentials: {
      accessKeyId: env[ENV.accessKeyId]!,
      secretAccessKey: env[ENV.secretAccessKey]!,
    },
    publicUrl: env[ENV.publicUrl] || undefined,
  };
}
