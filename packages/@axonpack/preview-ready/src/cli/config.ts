import { existsSync } from "node:fs";
import { join } from "node:path";

import type { S3Config } from "../core/s3";

export const ENV = {
  endpoint: "PREVIEW_READY_S3_ENDPOINT",
  bucket: "PREVIEW_READY_S3_BUCKET",
  region: "PREVIEW_READY_S3_REGION",
  accessKeyId: "PREVIEW_READY_S3_ACCESS_KEY_ID",
  secretAccessKey: "PREVIEW_READY_S3_SECRET_ACCESS_KEY",
  publicUrl: "PREVIEW_READY_S3_PUBLIC_URL",
} as const;

/**
 * Reads the bucket and write key from `.env` in the app's root, then the environment. A variable
 * already set in the environment wins over the file, so CI can pass its secrets without a file.
 */
export function readConfig(
  projectRoot: string,
  env: Record<string, string | undefined> = process.env,
): S3Config {
  const file = join(projectRoot, ".env");
  if (env === process.env && existsSync(file)) process.loadEnvFile(file);
  const missing = [
    ENV.endpoint,
    ENV.bucket,
    ENV.accessKeyId,
    ENV.secretAccessKey,
  ].filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Set ${missing.join(", ")} in ${file} or in the environment.`,
    );
  }
  return {
    endpoint: env[ENV.endpoint]!,
    bucket: env[ENV.bucket]!,
    region: env[ENV.region] || "us-east-1",
    credentials: {
      accessKeyId: env[ENV.accessKeyId]!,
      secretAccessKey: env[ENV.secretAccessKey]!,
    },
    publicUrl: env[ENV.publicUrl] || undefined,
  };
}
