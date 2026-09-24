import {
  DEFAULT_SEARCH_MODES,
  testMatch,
  type Matcher,
  type SearchModes,
} from '../../../core/utils/text-search.util';
import type { ConsoleLogEntry, ConsoleLogLevel } from '../stores/console-log.store';

export type ConsoleFilters = {
  search: string;
  modes: SearchModes;
  /** One level at a time, `null` for all of them. */
  level: ConsoleLogLevel | null;
  source: string | null;
};

export const DEFAULT_CONSOLE_FILTERS: ConsoleFilters = {
  search: '',
  modes: DEFAULT_SEARCH_MODES,
  level: null,
  source: null,
};

/** Whether anything is being filtered out, for the filled filter icon. */
export function hasActiveConsoleFilters(filters: ConsoleFilters): boolean {
  return filters.search.length > 0 || filters.level !== null || filters.source !== null;
}

/** The matcher is passed in, compiled once upstream, because each row also needs it to highlight. */
export function filterConsoleEntries(
  entries: ConsoleLogEntry[],
  filters: ConsoleFilters,
  matcher: Matcher | null
): ConsoleLogEntry[] {
  return entries.filter((entry) => {
    if (filters.level !== null && entry.level !== filters.level) return false;
    if (filters.source !== null && entry.source !== filters.source) return false;
    return testMatch(entry.text, matcher);
  });
}

export function countByLevel(entries: ConsoleLogEntry[]): Partial<Record<ConsoleLogLevel, number>> {
  const counts: Partial<Record<ConsoleLogLevel, number>> = {};
  for (const entry of entries) counts[entry.level] = (counts[entry.level] ?? 0) + 1;
  return counts;
}

/** Every source that has logged, or none while there is only one, since a single chip filters nothing. */
export function listSources(entries: ConsoleLogEntry[]): string[] {
  const seen = new Set<string>();
  for (const entry of entries) if (entry.source) seen.add(entry.source);
  return seen.size > 1 ? Array.from(seen) : [];
}
