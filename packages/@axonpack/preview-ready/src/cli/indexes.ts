import {
  PlatformIndex,
  IndexEntry,
  Platform,
  RootIndex,
  RootVersion,
  SCHEMA,
  platformIndexKey,
} from "../core/layout";

const newestFirst = (a: { publishedAt: string }, b: { publishedAt: string }) =>
  b.publishedAt.localeCompare(a.publishedAt);

/** Adds the entry, or replaces the one with the same id. */
export function upsertPreview(
  index: PlatformIndex | null,
  platform: Platform,
  fingerprint: string,
  entry: IndexEntry,
  now: string,
): PlatformIndex {
  const others = (index?.previews ?? []).filter((p) => p.id !== entry.id);
  return {
    schema: SCHEMA,
    platform,
    fingerprint,
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
    (v) =>
      !(v.platform === index.platform && v.fingerprint === index.fingerprint),
  );
  if (index.previews.length > 0) {
    const latest = index.previews[0];
    const version: RootVersion = {
      platform: index.platform,
      fingerprint: index.fingerprint,
      appVersion: latest.appVersion,
      buildNumber: latest.buildNumber,
      count: index.previews.length,
      updatedAt: now,
      index: platformIndexKey(index.platform, index.fingerprint),
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
