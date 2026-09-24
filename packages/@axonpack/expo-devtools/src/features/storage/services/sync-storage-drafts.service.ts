import { createStorageKey, setStorageValue } from './write-storage.service';
import { storageDraftsStore, EMPTY_DRAFTS } from '../stores/storage-drafts.store';
import { storageStore } from '../stores/storage.store';

/**
 * Writes every pending change for one store, one key at a time so a failure names its key. What was
 * written leaves the drafts; what failed stays, with its reason, to fix and sync again.
 *
 * An edit to a key that has gone since it was typed is refused rather than written: writing it would
 * bring back a key somebody deleted, which is a create nobody asked for.
 */
export async function syncStorageDrafts(adapterId: string): Promise<void> {
  const drafts = storageDraftsStore.getState().byAdapter[adapterId] ?? EMPTY_DRAFTS;
  const entries = storageStore
    .getSnapshot()
    .adapters.find((state) => state.adapter.id === adapterId)?.entries;
  const edits: Record<string, string> = {};
  const errors: Record<string, string> = {};

  storageDraftsStore.setSyncing(true);
  try {
    for (const [key, text] of Object.entries(drafts.edits)) {
      const entry = entries?.find((current) => current.key === key);
      const message = entry
        ? await setStorageValue(entry, text)
        : `"${key}" is no longer in the store.`;
      if (message !== null) {
        edits[key] = text;
        errors[`edit:${key}`] = message;
      }
    }

    const added = [];
    for (const row of drafts.added) {
      const message = await createStorageKey(adapterId, row.key.trim(), row.text, row.valueType);
      if (message !== null) {
        added.push(row);
        errors[`add:${row.id}`] = message;
      }
    }

    storageDraftsStore.replace(adapterId, { edits, added, errors });
  } finally {
    storageDraftsStore.setSyncing(false);
  }
}
