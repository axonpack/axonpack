import type { StorageAdapterState, StorageEntry } from '../stores/storage.store';

export type StorageSummary = {
  totalBytes: number;
  largest: StorageEntry | undefined;
  /** Said out loud, because each one would otherwise look like an empty or a writable store. */
  notes: string[];
};

export function summarizeStorage(state: StorageAdapterState): StorageSummary {
  const { adapter, entries } = state;

  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const largest = entries.reduce<StorageEntry | undefined>(
    (biggest, entry) => (biggest === undefined || entry.size > biggest.size ? entry : biggest),
    undefined
  );

  // Stated rather than glossed over: a capped or unenumerable read looks like an empty store
  // otherwise, and that's the one thing a storage inspector must never imply by accident.
  const notes = [
    adapter.canEnumerate
      ? undefined
      : `${adapter.name} can't list its own keys — showing the ${entries.length} you declared.`,
    state.truncated
      ? `Read ${entries.length} of ${state.totalKeys} keys — the rest are past the cap.`
      : undefined,
    adapter.readOnly ? 'Read-only — values here cannot be edited or deleted.' : undefined,
    // Not "3 keys are hidden": the keys are filtered before they are read, so the count of what
    // matched is something this tab deliberately never learns.
    adapter.hasBlacklist ? 'A blacklist is set — any key it matches was never read.' : undefined,
  ].filter((note): note is string => note !== undefined);

  return { totalBytes, largest, notes };
}

/** What an empty list says: still reading, a store with nothing in it, or a filter hiding it all. */
export function emptyListLabel(state: StorageAdapterState | undefined): string {
  if (state === undefined || state.status === 'reading') return 'Reading…';
  if (state.entries.length === 0) return 'This store holds no keys';
  return 'No keys match your filter';
}
