import { existsSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_REGION, S3Config, parseBucketUrl } from "../core/s3";

export const ENV = {
  url: "PREVIEW_READY_URL",
  publicUrl: "PREVIEW_READY_PUBLIC_URL",
  // The names every S3 tool already reads.
  accessKeyId: "AWS_ACCESS_KEY_ID",
  secretAccessKey: "AWS_SECRET_ACCESS_KEY",
  sessionToken: "AWS_SESSION_TOKEN",
  region: "AWS_REGION",
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
      sessionToken: env[ENV.sessionToken] || undefined,
    },
    publicUrl: env[ENV.publicUrl] || undefined,
  };
}
