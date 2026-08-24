import type { NetworkEntry } from '../stores/network-log.store';

/**
 * The log is a stream of what happened, so time is the order it is kept in — but the question a panel
 * is opened for is usually "which one is slow" or "which one is huge", and reading two hundred rows to
 * answer it is what a browser's sortable columns exist to avoid. There are no columns to click here,
 * so the key is picked once and the arrow in the toolbar flips it.
 */
export type NetworkSortKey = 'time' | 'size' | 'duration' | 'status';

export type NetworkSort = {
  key: NetworkSortKey;
  descending: boolean;
};

export const DEFAULT_NETWORK_SORT: NetworkSort = { key: 'time', descending: false };

export const SORT_KEYS: NetworkSortKey[] = ['time', 'size', 'duration', 'status'];

export const SORT_KEY_LABELS: Record<NetworkSortKey, string> = {
  time: 'Time',
  size: 'Size',
  duration: 'Duration',
  status: 'Status',
};

/**
 * What the arrow does, said in the vocabulary of the key rather than as "ascending" — the direction of
 * a size is not the direction of a clock, and "oldest first" is the only one of the four that reads
 * naturally as a time.
 */
const DIRECTION_LABELS: Record<NetworkSortKey, { ascending: string; descending: string }> = {
  time: { ascending: 'Oldest first', descending: 'Newest first' },
  size: { ascending: 'Smallest first', descending: 'Largest first' },
  duration: { ascending: 'Fastest first', descending: 'Slowest first' },
  status: { ascending: 'Lowest status first', descending: 'Highest status first' },
};

export function sortDirectionLabel(sort: NetworkSort): string {
  const labels = DIRECTION_LABELS[sort.key];
  return sort.descending ? labels.descending : labels.ascending;
}

/**
 * The value being sorted on, or `undefined` where the entry has none: a socket has no size and no
 * status code, and a request still in flight has neither a duration nor a code yet.
 *
 * `size` is the field the row prints rather than the wire count, so the order matches the column
 * someone is reading.
 */
function sortValue(entry: NetworkEntry, key: NetworkSortKey): number | undefined {
  if (key === 'time') return entry.startedAt;
  if (key === 'duration') return entry.duration;
  if (entry.kind === 'websocket') return undefined;
  return key === 'size' ? entry.size : entry.statusCode;
}

/**
 * Entries with nothing to compare keep their own order and stay at the end, whichever way the arrow
 * points — a pending request sorted to the top of "slowest first" would read as the slowest one.
 */
export function sortEntries(entries: readonly NetworkEntry[], sort: NetworkSort): NetworkEntry[] {
  const measured: { entry: NetworkEntry; value: number }[] = [];
  const unmeasured: NetworkEntry[] = [];

  for (const entry of entries) {
    const value = sortValue(entry, sort.key);
    if (value === undefined) unmeasured.push(entry);
    else measured.push({ entry, value });
  }

  measured.sort((a, b) => (sort.descending ? b.value - a.value : a.value - b.value));

  return [...measured.map((row) => row.entry), ...unmeasured];
}
