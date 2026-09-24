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

/** Sorted by key within a type, so switching to Type sort doesn't scramble the order inside a group. */
export function sortEntries(
  entries: StorageEntry[],
  field: StorageSortField,
  descending: boolean
): StorageEntry[] {
  const direction = descending ? -1 : 1;

  return [...entries].sort((a, b) => {
    if (field === 'size') return (a.size - b.size) * direction || a.key.localeCompare(b.key);
    if (field === 'type') {
      const byKind = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
      return byKind * direction || a.key.localeCompare(b.key);
    }
    return a.key.localeCompare(b.key) * direction;
  });
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
  return Array.from(byNamespace.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }));
}
