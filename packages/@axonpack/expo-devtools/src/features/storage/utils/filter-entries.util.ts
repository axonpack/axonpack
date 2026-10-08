import type { StoredValueKind } from './classify-value.util';
import { namespaceOf } from './formatters.util';
import {
  DEFAULT_SEARCH_MODES,
  testMatch,
  type Matcher,
  type SearchModes,
} from '../../../core/utils/text-search.util';
import type { StorageEntry } from '../stores/storage.store';

/** A key and its value are different haystacks — searching both at once is often the wrong one. */
export type StorageSearchScope = 'both' | 'keys' | 'values';

export type StorageFilters = {
  search: string;
  modes: SearchModes;
  scope: StorageSearchScope;
  invert: boolean;
  kind: StoredValueKind | null;
  hideEmpty: boolean;
  jsonOnly: boolean;
};

export const DEFAULT_STORAGE_FILTERS: StorageFilters = {
  search: '',
  modes: DEFAULT_SEARCH_MODES,
  scope: 'both',
  invert: false,
  kind: null,
  hideEmpty: false,
  jsonOnly: false,
};

export function matchesQuery(
  entry: StorageEntry,
  scope: StorageSearchScope,
  matcher: Matcher | null
): boolean {
  if (scope === 'keys') return testMatch(entry.key, matcher);
  if (scope === 'values') return testMatch(entry.text ?? '', matcher);
  return testMatch(`${entry.key} ${entry.text ?? ''}`, matcher);
}

/**
 * `invert` negates what you asked *for* — the search and the type chip. The two hide toggles stay
 * absolute, as in the Network tab: inverting them would resurrect the exact noise they suppress.
 */
export function matchesFilters(
  entry: StorageEntry,
  filters: StorageFilters,
  matcher: Matcher | null
): boolean {
  if (filters.hideEmpty && (entry.kind === 'empty' || entry.kind === 'absent')) return false;
  if (filters.jsonOnly && entry.kind !== 'json-object' && entry.kind !== 'json-array') return false;

  const matches =
    (filters.kind === null || entry.kind === filters.kind) &&
    matchesQuery(entry, filters.scope, matcher);

  return filters.invert ? !matches : matches;
}

export function hasActiveFilters(filters: StorageFilters): boolean {
  return (
    filters.search.length > 0 ||
    filters.invert ||
    filters.kind !== null ||
    filters.scope !== 'both' ||
    filters.hideEmpty ||
    filters.jsonOnly
  );
}

export type StorageSortField = 'key' | 'size' | 'type';

// ponytail: holds every key the tab has ever sorted. A dev tool's key set is small enough; clear
// it on refresh if a store with churning keys ever makes it matter.
const lowered = new Map<string, string>();

/** Each key is lowercased once, ever, rather than twice per comparison. */
function lowerKey(key: string): string {
  let lower = lowered.get(key);
  if (lower === undefined) {
    lower = key.toLowerCase();
    lowered.set(key, lower);
  }
  return lower;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

type SortableKey = { key: string; lower: string };

/**
 * Case-insensitive, with the original key breaking a tie so `A` and `a` always land the same way.
 * Not `localeCompare`: on Android, Hermes hands each call to the platform, and sorting 10,000 keys
 * that way held the JS thread for most of a second, on listing and again on every render.
 */
function compareSortableKeys(a: SortableKey, b: SortableKey): number {
  return compareText(a.lower, b.lower) || compareText(a.key, b.key);
}

export function sortKeys(keys: readonly string[]): string[] {
  return keys
    .map((key) => ({ key, lower: lowerKey(key) }))
    .sort(compareSortableKeys)
    .map(({ key }) => key);
}

const KIND_ORDER: StoredValueKind[] = [
  'json-object',
  'json-array',
  'string',
  'number',
  'boolean',
  'buffer',
  'empty',
  'absent',
];

/**
 * Sorted by key within a type, so switching to Type sort doesn't scramble the order inside a group.
 * An unread row has no size or type yet, so those two sorts put it last whichever way they run.
 */
export function sortEntries(
  entries: StorageEntry[],
  field: StorageSortField,
  descending: boolean
): StorageEntry[] {
  const direction = descending ? -1 : 1;

  return entries
    .map((entry) => ({ entry, key: entry.key, lower: lowerKey(entry.key) }))
    .sort((a, b) => {
      const unreadLast =
        field === 'key' ? 0 : Number(a.entry.kind === 'unread') - Number(b.entry.kind === 'unread');
      if (unreadLast !== 0) return unreadLast;
      if (field === 'size') {
        return (a.entry.size - b.entry.size) * direction || compareSortableKeys(a, b);
      }
      if (field === 'type') {
        const byKind = KIND_ORDER.indexOf(a.entry.kind) - KIND_ORDER.indexOf(b.entry.kind);
        return byKind * direction || compareSortableKeys(a, b);
      }
      return compareSortableKeys(a, b) * direction;
    })
    .map(({ entry }) => entry);
}

export function countByKind(
  entries: readonly StorageEntry[]
): Partial<Record<StoredValueKind, number>> {
  const counts: Partial<Record<StoredValueKind, number>> = {};
  for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  return counts;
}

/** Namespaces in name order, each keeping the order the entries came in. */
export function groupByNamespace(
  entries: readonly StorageEntry[]
): { title: string; data: StorageEntry[] }[] {
  const byNamespace = new Map<string, StorageEntry[]>();
  for (const entry of entries) {
    const title = namespaceOf(entry.key);
    const group = byNamespace.get(title) ?? [];
    group.push(entry);
    byNamespace.set(title, group);
  }
  return sortKeys([...byNamespace.keys()]).map((title) => ({
    title,
    data: byNamespace.get(title) ?? [],
  }));
}
