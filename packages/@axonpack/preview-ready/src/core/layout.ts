// The bucket layout and file formats, shared by the CLI that writes them and the app that reads them.
//
//   index.json                                   every native build and its previews, for people
//   index/<platform>/<fingerprint>.json          what one native build can run; the app reads this
//   previews/<platform>/<fingerprint>/<id>.json  one preview's manifest: its files and changelog
//   files/<sha256>                               bundle and image blobs, shared between previews

export const SCHEMA = 1;

export type Platform = "android" | "ios";

export const PLATFORMS: Platform[] = ["android", "ios"];

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
};

export type Manifest = PreviewInfo & {
  schema: number;
  platform: Platform;
  fingerprint: string;
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
  fingerprint: string;
  updatedAt: string;
  previews: IndexEntry[];
};

export type RootVersion = {
  platform: Platform;
  fingerprint: string;
  appVersion: string;
  buildNumber: string;
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
export const platformIndexKey = (platform: Platform, fingerprint: string) =>
  `index/${platform}/${fingerprint}.json`;
export const manifestKey = (
  platform: Platform,
  fingerprint: string,
  id: string,
) => `previews/${platform}/${fingerprint}/${id}.json`;
