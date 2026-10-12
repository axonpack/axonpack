import { VersionInfoUnavailableError } from "./errors";
import { currentPlatform, optionalRequire } from "./runtime";
import type { VersionInfoSource } from "./types";

type ExpoApplication = {
  applicationId: string | null;
  nativeApplicationVersion: string | null;
  nativeBuildVersion: string | null;
};
type ExpoLocalization = {
  getLocales?: () => { regionCode?: string | null }[];
  /** Removed in expo-localization 58, still there on old SDKs. */
  region?: string | null;
  country?: string | null;
};

const regionFromIntl = (): string | undefined => {
  try {
    return new Intl.DateTimeFormat()
      .resolvedOptions()
      .locale.match(/[-_]([A-Za-z]{2})\b/)?.[1]
      ?.toUpperCase();
  } catch {
    return undefined;
  }
};

/** expo-localization first (new API, then the old one), then Intl. Undefined when all fail. */
export const detectCountry = (): string | undefined => {
  let region: string | null | undefined;
  try {
    const localization = optionalRequire(
      () => require("expo-localization") as ExpoLocalization,
    );
    // A future release may change these. Whatever it does, the country is a nice-to-have, so
    // any failure here falls through to Intl.
    region =
      localization?.getLocales?.()?.[0]?.regionCode ??
      localization?.region ??
      localization?.country;
  } catch {
    region = undefined;
  }
  return (
    (typeof region === "string" && region) || regionFromIntl() || undefined
  );
};

const buildNumber = (
  value: string | null | undefined,
): number | string | undefined => {
  if (value == null) return undefined;
  // Android versionCode is a number, iOS buildNumber stays a string.
  return currentPlatform() === "android" && /^\d+$/.test(value)
    ? Number(value)
    : value;
};

const fromExpoApplication = (): VersionInfoSource | undefined => {
  const app = optionalRequire(
    () => require("expo-application") as ExpoApplication,
  );
  if (!app) return undefined;
  return {
    getCountry: detectCountry,
    getPackageName: () => app.applicationId ?? undefined,
    getCurrentBuildNumber: () => buildNumber(app.nativeBuildVersion),
    getCurrentVersion: () => app.nativeApplicationVersion ?? undefined,
  };
};

/** expo-application. */
export const createDefaultSource = (): VersionInfoSource => {
  const source = fromExpoApplication();
  if (!source) {
    throw new VersionInfoUnavailableError(
      "No version info source found. Install expo-application, or call setVersionInfo() with your own.",
    );
  }
  return source;
};

let override: VersionInfoSource | undefined;
let resolved: VersionInfoSource | undefined;

export const setVersionInfo = (source: VersionInfoSource | undefined): void => {
  override = source;
  resolved = undefined;
};

/** Resolved on first use, never at import, so importing the package loads no native module. */
export const getVersionInfo = (): VersionInfoSource => {
  if (override) return override;
  resolved ??= createDefaultSource();
  return resolved;
};
