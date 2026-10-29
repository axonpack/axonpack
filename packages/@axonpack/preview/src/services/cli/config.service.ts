import { join } from "node:path";

import { DEFAULT_REGION, S3Config, parseBucketUrl } from "../s3/s3.service";
import { appRequire } from "./project.service";

export const ENV = {
  url: "PREVIEW_S3_URL",
  accessKeyId: "PREVIEW_S3_ACCESS_KEY_ID",
  secretAccessKey: "PREVIEW_S3_SECRET_ACCESS_KEY",
  region: "PREVIEW_S3_REGION",
} as const;

/**
 * The `.env*` files the release bundle sees, read by the app's own `@expo/env`.
 * `export:embed --dev false` loads them in mode `production`, so this picks the same files, in the
 * same order, with the same expansion. `EXPO_NO_DOTENV` turns them off here too.
 */
const expoEnvFiles = (
  projectRoot: string,
  env: Record<string, string | undefined>,
): Record<string, string> =>
  appRequire(projectRoot)("@expo/env").parseProjectEnv(projectRoot, {
    mode: "production",
    silent: true,
    systemEnv: env,
  }).env;

/**
 * Reads where to publish and the write key from the environment, then the env files Expo loads
 * for a release build. The environment wins, so CI needs no file. Nothing else is read.
 */
export function readConfig(
  projectRoot: string,
  env: Record<string, string | undefined> = process.env,
): S3Config {
  env = { ...expoEnvFiles(projectRoot, env), ...env };
  const missing = [ENV.url, ENV.accessKeyId, ENV.secretAccessKey].filter(
    (name) => !env[name],
  );
  if (missing.length > 0) {
    throw new Error(
      `Set ${missing.join(", ")} in the environment (CI secrets), or locally in ${join(projectRoot, ".env.local")}. Any env file Expo loads for a release build works, but keep the write key out of a committed .env.`,
    );
  }
  return {
    ...parseBucketUrl(env[ENV.url]!),
    region: env[ENV.region] || DEFAULT_REGION,
    credentials: {
      accessKeyId: env[ENV.accessKeyId]!,
      secretAccessKey: env[ENV.secretAccessKey]!,
    },
  };
}
