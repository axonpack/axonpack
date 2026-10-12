import type { MockVersion } from "./mock";
import type { UpdateType } from "./semver";

export type Platform = "ios" | "android";

/** Where the installed app's own version, build, id and region come from. */
export interface VersionInfoSource {
  getCountry: () => Promise<string | undefined> | string | undefined;
  getPackageName: () => string | undefined;
  getCurrentBuildNumber: () => number | string | undefined;
  getCurrentVersion: () => string | undefined;
}

export type ProviderResult = {
  version: string;
  storeUrl?: string;
  releaseNotes?: string;
  releaseDate?: string;
  /** Oldest version still allowed to run. Anything below it is a forced update. */
  minimumVersion?: string;
  /** Compared only when `version` equals the installed version. */
  buildNumber?: number | string;
};

export type RequestOptions = {
  /** Default 10000. 0 turns the timeout off. */
  timeoutMs?: number;
  /** Extra tries after a network error, 429 or 5xx. Default 1. */
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
  fetchOptions?: RequestInit;
  /** Replaces the global fetch. Mostly for tests. */
  fetch?: typeof fetch;
};

/** What a provider receives: the caller's options with the app's own details filled in. */
export type ProviderContext = RequestOptions & {
  platform?: Platform;
  country?: string;
  packageName?: string;
  currentVersion?: string;
  /** Storefront to try when the app is not listed in `country`. Default "us". */
  fallbackCountry?: string;
  [key: string]: unknown;
};

export interface Provider {
  getVersion: (context: ProviderContext) => Promise<ProviderResult>;
}

/** A bare function may return just the version string,. */
export type ProviderFunction = (
  context: ProviderContext,
) => string | ProviderResult | Promise<string | ProviderResult>;

export type ProviderOption =
  "appStore" | "playStore" | Provider | ProviderFunction;

export type GetLatestVersionOption = RequestOptions & {
  provider?: ProviderOption;
  platform?: Platform;
  country?: string;
  packageName?: string;
  fallbackCountry?: string;
  /** Fake a release. Ignored unless __DEV__ is true. */
  mock?: MockVersion;
  /** Skip the cache. */
  forceUpdate?: boolean;
  /** Default 300000 (5 minutes). 0 turns the cache off. */
  cacheTtlMs?: number;
  /** Default true: warn and resolve undefined instead of throwing. */
  ignoreErrors?: boolean;
};

export type NeedUpdateOption = GetLatestVersionOption & {
  currentVersion?: string;
  latestVersion?: string;
  /** Compare only this many version segments. Default: all. */
  depth?: number;
  /**
   * Your own ordering for a version format the built-in one cannot read. Return negative, zero or
   * positive like Array.sort. `depth` is ignored when this is set.
   */
  compare?: (a: string, b: string) => number;
  /** Versions below this are a forced update. Overrides what the provider reports. */
  minimumVersion?: string;
  /** A soft update to this exact version is reported as not needed. Never mutes a forced update. */
  skipVersion?: string;
  currentBuildNumber?: number | string;
  latestBuildNumber?: number | string;
  /** Used when `latestVersion` is given, since no provider is asked. */
  storeUrl?: string;
};

export type NeedUpdateResult = {
  isNeeded: boolean;
  storeUrl: string;
  currentVersion: string;
  latestVersion: string;
  isForced: boolean;
  isSkipped: boolean;
  updateType: UpdateType;
  minimumVersion?: string;
  releaseNotes?: string;
  releaseDate?: string;
};

export type GetAppStoreUrlOption = {
  country?: string;
  appID?: string;
  packageName?: string;
  ignoreErrors?: boolean;
} & RequestOptions;

export type GetPlayStoreUrlOption = {
  packageName?: string;
  ignoreErrors?: boolean;
};

export type GetStoreUrlOption = GetAppStoreUrlOption &
  GetPlayStoreUrlOption & { platform?: Platform };
