import { Platform as RNPlatform } from "react-native";

import { buildFingerprint } from "./build-info";
import type { Platform } from "./core/layout";
import { DEFAULT_REGION, S3Config, parseBucketUrl } from "./core/s3";

/**
 * What the app passes in. It mirrors the publish side's `.env`: the same bucket URL, plus a
 * read-only key when the bucket is private. Nothing here is read from the environment; the app
 * decides where each value comes from.
 */
export type PreviewReadyConfig = {
  /** Previews are on only when this is true. The app decides per build; nothing is detected. */
  enabled: boolean;
  /** `<endpoint>/<bucket>[/<folder>]`, the same value as `PREVIEW_READY_URL` when publishing. */
  url: string;
  /** Read-only key id, for a private bucket. Leave out for a public one. */
  readKey?: string;
  readSecret?: string;
  /** Signing region. Default us-east-1, which MinIO and R2 accept. */
  region?: string;
  /** Where public reads go when that isn't `<endpoint>/<bucket>`, such as R2's r2.dev address. */
  publicUrl?: string;
  /** This build's fingerprint, when the config plugin is not used. */
  fingerprint?: string;
};

export function toS3Config(config: PreviewReadyConfig): S3Config {
  return {
    ...parseBucketUrl(config.url),
    region: config.region ?? DEFAULT_REGION,
    credentials:
      config.readKey && config.readSecret
        ? { accessKeyId: config.readKey, secretAccessKey: config.readSecret }
        : undefined,
    publicUrl: config.publicUrl,
  };
}

export const currentPlatform = (): Platform | null =>
  RNPlatform.OS === "android" || RNPlatform.OS === "ios" ? RNPlatform.OS : null;

/** The build to ask previews for. Null means previews cannot be listed on this build. */
export const resolveFingerprint = (config: PreviewReadyConfig): string | null =>
  config.fingerprint ?? buildFingerprint();
