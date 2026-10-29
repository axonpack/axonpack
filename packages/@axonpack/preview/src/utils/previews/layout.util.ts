// The bucket layout and file formats, shared by the CLI that writes them and the app that reads them.
//
//   index.json                            every native build and its previews, for people
//   index/<platform>/<key>.json           what one native build can run; the app reads this
//   previews/<platform>/<key>/<id>.json   one preview's manifest: its files and changelog
//   files/<sha256>                        bundle and image blobs, shared between previews
//
// <key> names the native build a preview runs on: `version-<app version>` or
// `fingerprint-<hash>`, depending on the app's `compatibility` setting.

export const SCHEMA = 1;

export type Platform = "android" | "ios";

export const PLATFORMS: Platform[] = ["android", "ios"];

/**
 * How a preview is matched to a native build. `appVersion` (the default) trusts the app's version:
 * simple, but a native change without a version bump goes unnoticed. `fingerprint` hashes the
 * native side, so any native change makes older previews incompatible.
 */
export type Compatibility = "appVersion" | "fingerprint";

export const DEFAULT_COMPATIBILITY: Compatibility = "appVersion";

export const isCompatibility = (value: unknown): value is Compatibility =>
  value === "appVersion" || value === "fingerprint";

/**
 * The key a build and its previews share. Characters a bucket path should not carry are replaced,
 * so any version string works. app.plugin.js builds the same key; a test keeps the two in step.
 */
export const compatibilityKey = (
  compatibility: Compatibility,
  value: string,
): string =>
  `${compatibility === "appVersion" ? "version" : "fingerprint"}-${value.replace(/[^A-Za-z0-9._-]/g, "_")}`;

/** The setting a key was made with, read back from its prefix. */
export const compatibilityOfKey = (key: string): Compatibility =>
  key.startsWith("version-") ? "appVersion" : "fingerprint";

/** What `expo export:embed` names the bundle, so a preview folder matches what a build embeds. */
export const BUNDLE_FILE: Record<Platform, string> = {
  android: "index.android.bundle",
  ios: "main.jsbundle",
};

export type ManifestFile = { path: string; sha256: string; size: number };

/** Shown to QA in the list, and kept in both the manifest and the index entry. */
export type PreviewInfo = {
  id: string;
  title: string;
  branch: string;
  commit: string;
  author: string;
  publishedAt: string;
  appVersion: string;
  buildNumber: string;
  compatibility: Compatibility;
  /** The native build's fingerprint when it was published, whatever the compatibility setting. */
  fingerprint: string;
  /** The EAS environment it was built with (`publish --environment`). Absent on older entries. */
  environment?: string;
};

/** Leaves `environment` out when there is none, so entries without it look as they always did. */
export const previewInfo = (
  info: Omit<PreviewInfo, "environment">,
  environment?: string,
): PreviewInfo => (environment ? { ...info, environment } : info);

export type Manifest = PreviewInfo & {
  schema: number;
  platform: Platform;
  key: string;
  bundle: string;
  hermesVersion: number | null;
  changelog: string;
  files: ManifestFile[];
};

export type IndexEntry = PreviewInfo & {
  /** Changes whenever any file changes, so the app can tell its download is out of date. */
  revision: string;
  size: number;
  changelog: string;
  manifest: string;
};

export type PlatformIndex = {
  schema: number;
  platform: Platform;
  key: string;
  compatibility: Compatibility;
  updatedAt: string;
  previews: IndexEntry[];
};

export type RootVersion = {
  platform: Platform;
  key: string;
  compatibility: Compatibility;
  appVersion: string;
  buildNumber: string;
  fingerprint: string;
  count: number;
  updatedAt: string;
  index: string;
  previews: { id: string; title: string; publishedAt: string }[];
};

export type RootIndex = {
  schema: number;
  updatedAt: string;
  versions: RootVersion[];
};

export const ROOT_INDEX_KEY = "index.json";
export const fileKey = (sha256: string) => `files/${sha256}`;
export const platformIndexKey = (platform: Platform, key: string) =>
  `index/${platform}/${key}.json`;
export const manifestKey = (platform: Platform, key: string, id: string) =>
  `previews/${platform}/${key}/${id}.json`;
