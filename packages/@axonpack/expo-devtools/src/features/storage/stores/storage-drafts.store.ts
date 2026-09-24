import { createAxonStore } from '../../../core/stores/axon.store';
import type { StorageValueType } from '../services/define-adapter.service';

/** A key typed into the empty row at the bottom of the table, not yet written. */
export type StorageDraftRow = {
  id: number;
  key: string;
  valueType: StorageValueType;
  text: string;
};

export type StorageAdapterDrafts = {
  /** New text for keys already in the store, by key. */
  edits: Record<string, string>;
  added: StorageDraftRow[];
  /** Why the last sync could not write one: `edit:<key>` or `add:<id>`. */
  errors: Record<string, string>;
};

export const EMPTY_DRAFTS: StorageAdapterDrafts = { edits: {}, added: [], errors: {} };

/**
 * Changes made in the DevTools table and not yet synced, per store. A store rather than the panel's
 * state so switching to another panel and back does not throw them away. Only the DevTools tab
 * reads it: a draft is shown by the surface it was typed on, and the app sees the value once synced.
 */
const initial: { byAdapter: Record<string, StorageAdapterDrafts>; syncing: boolean } = {
  byAdapter: {},
  syncing: false,
};

let nextId = 1;

export const storageDraftsStore = createAxonStore(initial, (set, get) => {
  const patch = (adapterId: string, next: (drafts: StorageAdapterDrafts) => StorageAdapterDrafts) =>
    set({
      byAdapter: {
        ...get().byAdapter,
        [adapterId]: next(get().byAdapter[adapterId] ?? EMPTY_DRAFTS),
      },
    });
  const without = (record: Record<string, string>, key: string) => {
    const { [key]: _gone, ...rest } = record;
    return rest;
  };

  return {
    /** `null` drops the draft, which is also what typing the stored value back does. */
    setEdit: (adapterId: string, key: string, text: string | null) =>
      patch(adapterId, (drafts) => ({
        ...drafts,
        edits: text === null ? without(drafts.edits, key) : { ...drafts.edits, [key]: text },
        errors: without(drafts.errors, `edit:${key}`),
      })),
    addRow: (adapterId: string, row: Omit<StorageDraftRow, 'id'>) =>
      patch(adapterId, (drafts) => ({
        ...drafts,
        added: [...drafts.added, { ...row, id: nextId++ }],
      })),
    removeRow: (adapterId: string, id: number) =>
      patch(adapterId, (drafts) => ({
        ...drafts,
        added: drafts.added.filter((row) => row.id !== id),
        errors: without(drafts.errors, `add:${id}`),
      })),
    discard: (adapterId: string) => patch(adapterId, () => EMPTY_DRAFTS),
    replace: (adapterId: string, drafts: StorageAdapterDrafts) => patch(adapterId, () => drafts),
    setSyncing: (syncing: boolean) => set({ syncing }),
  };
});

export const useStorageDraftsStore = storageDraftsStore.useStore;

export function pendingCount(drafts: StorageAdapterDrafts): number {
  return Object.keys(drafts.edits).length + drafts.added.length;
}
