import {
  DEFAULT_SEARCH_MODES,
  testMatch,
  type Matcher,
  type SearchModes,
} from '../../../core/utils/text-search.util';
import type { CrashKind, CrashRecord } from '../stores/crash.store';

/** Worst first: the order the kind filters are offered in. */
export const KIND_ORDER: CrashKind[] = [
  'js-fatal',
  'native-exception',
  'react-render',
  'unhandled-rejection',
  'js-error',
];

export type CrashFilters = {
  search: string;
  modes: SearchModes;
  /** Several at once, unlike the Console's levels. Empty means every kind. */
  kinds: CrashKind[];
};

export const DEFAULT_CRASH_FILTERS: CrashFilters = {
  search: '',
  modes: DEFAULT_SEARCH_MODES,
  kinds: [],
};

/** The matcher is passed in, compiled once upstream, so a keystroke compiles it once. */
export function filterCrashRecords(
  records: CrashRecord[],
  filters: CrashFilters,
  matcher: Matcher | null
): CrashRecord[] {
  return records.filter((record) => {
    if (filters.kinds.length > 0 && !filters.kinds.includes(record.kind)) return false;
    return testMatch(`${record.name} ${record.message} ${record.stack ?? ''}`, matcher);
  });
}

export function countByKind(records: CrashRecord[]): Partial<Record<CrashKind, number>> {
  const counts: Partial<Record<CrashKind, number>> = {};
  for (const record of records) counts[record.kind] = (counts[record.kind] ?? 0) + 1;
  return counts;
}

export function toggleKind(kinds: CrashKind[], kind: CrashKind): CrashKind[] {
  return kinds.includes(kind) ? kinds.filter((current) => current !== kind) : [...kinds, kind];
}

export function hasActiveCrashFilters(filters: CrashFilters): boolean {
  return filters.search.length > 0 || filters.kinds.length > 0;
}
