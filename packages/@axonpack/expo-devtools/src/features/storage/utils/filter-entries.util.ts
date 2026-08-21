import type { StoredValueKind } from './classify-value.util';
import type { StorageEntry } from '../stores/storage.store';
import {
  DEFAULT_SEARCH_MODES,
  testMatch,
  type Matcher,
  type SearchModes,
} from '../../../core/utils/text-search.util';

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
