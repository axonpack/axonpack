import { messageOf, readAdapterById } from './read-storage.service';
import { storageStore } from '../stores/storage.store';
import type { StorageImportPlan } from '../utils/build-storage-export.util';

export type StorageImportResult = {
  written: number;
  failures: { key: string; message: string }[];
  /** Set when nothing could be attempted at all — a store that went away, or one that can't write. */
  error: string | null;
};

/**
 * Writes the keys the plan accepted, one at a time rather than in parallel: a store handed a hundred
 * concurrent writes is a store being tested rather than inspected, and a failure in the middle of a
 * batch has to be attributable to the key that caused it.
 *
 * The whole store is re-read afterwards instead of patching each key in, because an import is the one
 * write here that can touch enough keys for the difference to matter — and a store is free to
 * normalise every one of them.
 */
export async function applyStorageImport(
  adapterId: string,
  plan: StorageImportPlan
): Promise<StorageImportResult> {
  const adapter = storageStore.findAdapter(adapterId);
  if (!adapter) return { written: 0, failures: [], error: 'That store is no longer registered.' };

  const { setItem } = adapter;
  if (!setItem || !adapter.canEdit) {
    return { written: 0, failures: [], error: `${adapter.name} is read-only.` };
  }

  const failures: { key: string; message: string }[] = [];
  let written = 0;

  for (const entry of [...plan.create, ...plan.overwrite]) {
    // `value` is non-null for everything the plan accepted; the empty ones are in `skipped`.
    try {
      await setItem(entry.key, entry.value ?? '', entry.type);
      written += 1;
    } catch (error) {
      failures.push({ key: entry.key, message: messageOf(error) });
    }
  }

  if (written > 0) await readAdapterById(adapterId);

  return { written, failures, error: null };
}
