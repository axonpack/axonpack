import type { IndexEntry } from "./core/layout";
import type { LocalPreview } from "./local";
import type { PreviewsState } from "./previews.store";

export type PreviewStatus =
  | "available"
  | "downloading"
  | "downloaded"
  | "update-available"
  | "unpublished"
  | "broken";

export type PreviewItem = {
  id: string;
  /** The bucket's entry, or the one saved with the download once it is unpublished. */
  entry: IndexEntry;
  status: PreviewStatus;
  /** 0 to 1 while downloading. */
  progress: number | null;
  active: boolean;
  local: LocalPreview | null;
};

/**
 * The list QA sees for this build: everything the bucket offers, plus downloads it no longer lists
 * (unpublished). Downloads for another build go to `incompatible` instead; nothing expires.
 */
export function previewItems(state: PreviewsState): {
  items: PreviewItem[];
  incompatible: LocalPreview[];
} {
  const compatible = state.local.filter((p) => p.key === state.buildKey);
  const incompatible = state.local.filter((p) => p.key !== state.buildKey);
  const localById = new Map(compatible.map((p) => [p.id, p]));
  const remote = state.remote ?? [];

  const item = (
    entry: IndexEntry,
    local: LocalPreview | null,
    listed: boolean,
  ): PreviewItem => {
    const progress = state.downloading[entry.id] ?? null;
    let status: PreviewStatus = "available";
    if (progress !== null) status = "downloading";
    else if (local && state.broken.includes(entry.id)) status = "broken";
    else if (local && !listed && state.remote !== null) status = "unpublished";
    else if (local && listed && local.revision !== entry.revision)
      status = "update-available";
    else if (local) status = "downloaded";
    return {
      id: entry.id,
      entry,
      status,
      progress,
      active: state.activeId === entry.id,
      local,
    };
  };

  const items = remote.map((entry) =>
    item(entry, localById.get(entry.id) ?? null, true),
  );
  for (const local of compatible) {
    if (!remote.some((entry) => entry.id === local.id))
      items.push(item(local.entry, local, false));
  }
  return { items, incompatible };
}
