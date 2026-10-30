import { Platform as RNPlatform } from "react-native";

import { buildKey } from "../../services/native/build-info.service";
import type { Platform } from "../previews/layout.util";
import {
  type HostAddress,
  type HostProblem,
  checkNewHost,
} from "../dev-preview-servers/hosts.util";
import {
  DEFAULT_REGION,
  S3Config,
  parseBucketUrl,
} from "../../services/s3/s3.service";

/**
 * What the app passes in. Nothing here is read from the environment; the app decides where each
 * value comes from.
 */
export type PreviewConfig = {
  /** Previews are on only when this is true. The app decides per build; nothing is detected. */
  enabled: boolean;
  /** Where the previews are and how to read them. */
  s3Config?: PreviewS3Config;
  /**
   * Lists the Metro servers for this app running on the developer's computer, and switches
   * between them live. Debug builds only; off unless `enabled` is true. `true` turns it on with the
   * defaults; an object also sets the hosts.
   */
  devPreviewServers?: boolean | DevPreviewServersOptions;
  /**
   * This build's key (`version-<app version>` or `fingerprint-<hash>`), only when the config plugin
   * is not used to bake it in.
   */
  buildKey?: string;
  /** @deprecated Use `s3Config.url`. */
  url?: string;
  /** @deprecated Use `s3Config.readAccessKeyId`. */
  readAccessKeyId?: string;
  /** @deprecated Use `s3Config.readSecretAccessKey`. */
  readSecretAccessKey?: string;
  /** @deprecated Use `s3Config.region`. */
  region?: string;
  /** @deprecated Use `s3Config.headers`. */
  headers?: Record<string, string>;
};

/**
 * The bucket, as the app reads it. It mirrors the publish side's `.env`: the same bucket URL, plus
 * a read-only key when the bucket is private.
 */
export type PreviewS3Config = {
  /**
   * Where the previews are. With a read key: `<endpoint>/<bucket>[/<folder>]`, the same value as
   * `PREVIEW_S3_URL` when publishing. Without one, any address the objects are public under:
   * that same URL for a public bucket, or R2's `https://pub-<id>.r2.dev` or a CDN. Undefined,
   * empty or blank means previews are not set up: nothing is read, and the list says so.
   */
  url?: string;
  /** Read-only key, for a private bucket. Leave out for a public one. Never the write key. */
  readAccessKeyId?: string;
  readSecretAccessKey?: string;
  /** Signing region. Default us-east-1, which MinIO and R2 accept. */
  region?: string;
  /** Extra headers on every read, for a proxy, CDN or tunnel in front of the bucket. */
  headers?: Record<string, string>;
};

/** `devPreviewServers` as an object, for more than on or off. */
export type DevPreviewServersOptions = {
  /** Default true. */
  enabled?: boolean;
  /** Shows "Add a host", so QA can add another computer on the device. Default true. */
  allowCustomHosts?: boolean;
  /**
   * Other computers whose `preview start` servers the list shows, as "192.168.1.24" or
   * "qa-mac.local:19150". The port is their registry's, 19150 when left out. localhost, 127.0.0.1
   * and, on Android, 10.0.2.2 are always checked and need no entry.
   */
  hosts?: string[];
};

/** `devPreviewServers` with the defaults filled in. */
export type DevServersSetup = {
  enabled: boolean;
  allowCustomHosts: boolean;
  /** The app's own hosts that read as hosts, each once. */
  hosts: HostAddress[];
  /** Entries left out of `hosts`, and why, for a warning. */
  skipped: { text: string; problem: HostProblem }[];
};

export function devServersSetup(
  input: PreviewConfig["devPreviewServers"],
): DevServersSetup {
  const options = input === true ? {} : input || { enabled: false };
  const hosts: HostAddress[] = [];
  const skipped: DevServersSetup["skipped"] = [];
  for (const text of options.hosts ?? []) {
    const host = checkNewHost(text, hosts);
    if (typeof host === "string") skipped.push({ text, problem: host });
    else hosts.push(host);
  }
  return {
    enabled: options.enabled ?? true,
    allowCustomHosts: options.allowCustomHosts ?? true,
    hosts,
    skipped,
  };
}

/**
 * A build made without its `.env` passes an empty URL, and the bucket path then fails deep inside
 * the request as "Invalid URL: /index/ios/...". This says which setting is missing instead.
 */
export function checkBucketUrl(url: string): void {
  const value = url.trim();
  if (!value) {
    throw new Error(
      "No bucket URL. Set `s3Config.url` in the preview config (for example from EXPO_PUBLIC_PREVIEW_S3_URL in .env) and rebuild.",
    );
  }
  if (!/^https?:\/\/[^/?#]+/i.test(value)) {
    throw new Error(
      `The bucket URL "${value}" is not a full address. Set \`s3Config.url\` in the preview config (for example from EXPO_PUBLIC_PREVIEW_S3_URL in .env) to one starting with https:// or http://.`,
    );
  }
}

// toS3Config runs on every read, so a config that sets both says so once per run, not per read.
let warnedBoth = false;

/**
 * The bucket settings from `s3Config`, or from the flat fields 0.1.0 took. When both are set,
 * `s3Config` wins.
 */
export function bucketSettings(config: PreviewConfig): PreviewS3Config {
  const {
    s3Config,
    url,
    readAccessKeyId,
    readSecretAccessKey,
    region,
    headers,
  } = config;
  if (!s3Config) {
    return {
      url: url ?? "",
      readAccessKeyId,
      readSecretAccessKey,
      region,
      headers,
    };
  }
  const flat = [url, readAccessKeyId, readSecretAccessKey, region, headers];
  if (!warnedBoth && flat.some((value) => value !== undefined)) {
    warnedBoth = true;
    console.warn(
      "@axonpack/preview: the preview config sets both `s3Config` and the old top-level bucket fields. Using `s3Config`. Remove `url`, `readAccessKeyId`, `readSecretAccessKey`, `region` and `headers` from the top level.",
    );
  }
  return s3Config;
}

/**
 * A bucket URL is set, in `s3Config` or the old flat field. Left out, empty or blank means the app
 * has not set previews up yet, which is a state to show, not an error.
 */
export const previewsConfigured = (config: PreviewConfig): boolean =>
  Boolean(bucketSettings(config).url?.trim());

export function toS3Config(config: PreviewConfig): S3Config {
  const s3 = bucketSettings(config);
  const url = s3.url ?? "";
  checkBucketUrl(url);
  const region = s3.region ?? DEFAULT_REGION;
  const { headers } = s3;
  // Signing needs the bucket apart from the endpoint; a plain read only needs the base address.
  if (s3.readAccessKeyId && s3.readSecretAccessKey) {
    return {
      ...parseBucketUrl(url),
      region,
      credentials: {
        accessKeyId: s3.readAccessKeyId,
        secretAccessKey: s3.readSecretAccessKey,
      },
      headers,
    };
  }
  return { endpoint: url.trim(), region, headers };
}

export const currentPlatform = (): Platform | null =>
  RNPlatform.OS === "android" || RNPlatform.OS === "ios" ? RNPlatform.OS : null;

/** The build to ask previews for. Null means previews cannot be listed on this build. */
export const resolveBuildKey = (config: PreviewConfig): string | null =>
  config.buildKey ?? buildKey();
