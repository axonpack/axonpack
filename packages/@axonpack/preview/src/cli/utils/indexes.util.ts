import {
  Compatibility,
  PlatformIndex,
  IndexEntry,
  Platform,
  RootIndex,
  RootVersion,
  SCHEMA,
  platformIndexKey,
} from "../../core/utils/layout.util";

const newestFirst = (a: { publishedAt: string }, b: { publishedAt: string }) =>
  b.publishedAt.localeCompare(a.publishedAt);

/** Adds the entry, or replaces the one with the same id. */
export function upsertPreview(
  index: PlatformIndex | null,
  platform: Platform,
  build: { key: string; compatibility: Compatibility },
  entry: IndexEntry,
  now: string,
): PlatformIndex {
  const others = (index?.previews ?? []).filter((p) => p.id !== entry.id);
  return {
    schema: SCHEMA,
    platform,
    key: build.key,
    compatibility: build.compatibility,
    updatedAt: now,
    previews: [...others, entry].sort(newestFirst),
  };
}

export function removePreview(
  index: PlatformIndex,
  id: string,
  now: string,
): PlatformIndex {
  return {
    ...index,
    updatedAt: now,
    previews: index.previews.filter((p) => p.id !== id),
  };
}

/** Mirrors one platform index into the top-level list; a build left with no previews drops out. */
export function syncRootVersion(
  root: RootIndex | null,
  index: PlatformIndex,
  now: string,
): RootIndex {
  const versions = (root?.versions ?? []).filter(
    (v) => !(v.platform === index.platform && v.key === index.key),
  );
  if (index.previews.length > 0) {
    const latest = index.previews[0];
    const version: RootVersion = {
      platform: index.platform,
      key: index.key,
      compatibility: index.compatibility,
      appVersion: latest.appVersion,
      buildNumber: latest.buildNumber,
      fingerprint: latest.fingerprint,
      count: index.previews.length,
      updatedAt: now,
      index: platformIndexKey(index.platform, index.key),
      previews: index.previews.map(({ id, title, publishedAt }) => ({
        id,
        title,
        publishedAt,
      })),
    };
    versions.push(version);
  }
  versions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { schema: SCHEMA, updatedAt: now, versions };
}

/** Every platform index that lists the id, from the top-level list. */
export const indexesListing = (root: RootIndex | null, id: string): string[] =>
  (root?.versions ?? [])
    .filter((v) => v.previews.some((p) => p.id === id))
    .map((v) => v.index);
