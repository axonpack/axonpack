import { existsSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_REGION, S3Config, parseBucketUrl } from "../core/s3";

export const ENV = {
  url: "PREVIEW_READY_S3_URL",
  accessKeyId: "PREVIEW_READY_S3_ACCESS_KEY_ID",
  secretAccessKey: "PREVIEW_READY_S3_SECRET_ACCESS_KEY",
  region: "PREVIEW_READY_S3_REGION",
  publicUrl: "PREVIEW_READY_S3_PUBLIC_URL",
} as const;

/**
 * Reads where to publish and the write key from `.env` in the app's root, then the environment. A
 * variable already set in the environment wins over the file, so CI can pass its secrets without one.
 */
export function readConfig(
  projectRoot: string,
  env: Record<string, string | undefined> = process.env,
): S3Config {
  const file = join(projectRoot, ".env");
  if (env === process.env && existsSync(file)) process.loadEnvFile(file);
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
