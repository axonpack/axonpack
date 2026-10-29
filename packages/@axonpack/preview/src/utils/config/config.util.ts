import { Platform as RNPlatform } from "react-native";

import { buildKey } from "../../services/native/build-info.service";
import type { Platform } from "../previews/layout.util";
import {
  DEFAULT_REGION,
  S3Config,
  parseBucketUrl,
} from "../../services/s3/s3.service";

/**
 * What the app passes in. It mirrors the publish side's `.env`: the same bucket URL, plus a
 * read-only key when the bucket is private. Nothing here is read from the environment; the app
 * decides where each value comes from.
 */
export type PreviewConfig = {
  /** Previews are on only when this is true. The app decides per build; nothing is detected. */
  enabled: boolean;
  /**
   * Where the previews are. With a read key: `<endpoint>/<bucket>[/<folder>]`, the same value as
   * `PREVIEW_S3_URL` when publishing. Without one, any address the objects are public under:
   * that same URL for a public bucket, or R2's `https://pub-<id>.r2.dev` or a CDN.
   */
  url: string;
  /** Read-only key, for a private bucket. Leave out for a public one. Never the write key. */
  readAccessKeyId?: string;
  readSecretAccessKey?: string;
  /** Signing region. Default us-east-1, which MinIO and R2 accept. */
  region?: string;
  /**
   * Lists the Metro servers for this app running on the developer's computer, and switches
   * between them live. Debug builds only; off unless `enabled` is true.
   */
  devPreviewServers?: boolean;
  /** Extra headers on every read, for a proxy, CDN or tunnel in front of the bucket. */
  headers?: Record<string, string>;
  /**
   * This build's key (`version-<app version>` or `fingerprint-<hash>`), only when the config plugin
   * is not used to bake it in.
   */
  buildKey?: string;
};

/**
 * A build made without its `.env` passes an empty URL, and the bucket path then fails deep inside
 * the request as "Invalid URL: /index/ios/...". This says which setting is missing instead.
 */
export function checkBucketUrl(url: string): void {
  const value = url.trim();
  if (!value) {
    throw new Error(
      "No bucket URL. Set `url` in the preview config (for example from EXPO_PUBLIC_PREVIEW_S3_URL in .env) and rebuild.",
    );
  }
  if (!/^https?:\/\/[^/?#]+/i.test(value)) {
    throw new Error(
      `The bucket URL "${value}" is not a full address. Set \`url\` in the preview config (for example from EXPO_PUBLIC_PREVIEW_S3_URL in .env) to one starting with https:// or http://.`,
    );
  }
}

export function toS3Config(config: PreviewConfig): S3Config {
  checkBucketUrl(config.url);
  const region = config.region ?? DEFAULT_REGION;
  const { headers } = config;
  // Signing needs the bucket apart from the endpoint; a plain read only needs the base address.
  if (config.readAccessKeyId && config.readSecretAccessKey) {
    return {
      ...parseBucketUrl(config.url),
      region,
      credentials: {
        accessKeyId: config.readAccessKeyId,
        secretAccessKey: config.readSecretAccessKey,
      },
      headers,
    };
  }
  return { endpoint: config.url.trim(), region, headers };
}

export const currentPlatform = (): Platform | null =>
  RNPlatform.OS === "android" || RNPlatform.OS === "ios" ? RNPlatform.OS : null;

/** The build to ask previews for. Null means previews cannot be listed on this build. */
export const resolveBuildKey = (config: PreviewConfig): string | null =>
  config.buildKey ?? buildKey();
