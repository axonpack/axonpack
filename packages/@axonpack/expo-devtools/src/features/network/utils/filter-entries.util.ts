import { parseByteSize, parseDurationMs } from './parse-threshold.util';
import { classifyResourceType, type ResourceType } from './resource-type.util';
import { matchesStatusQuery, parseStatusQuery, type ParsedStatusQuery } from './status-query.util';
import {
  DEFAULT_SEARCH_MODES,
  testMatch,
  type Matcher,
  type SearchModes,
} from '../../../core/utils/text-search.util';
import type { NetworkLogEntry, WebSocketLogEntry } from '../stores/network-log.store';

/** A `2xx`-style band, or the two states that have no code of their own. */
export type StatusClass = string;

export const FAILED_STATUS: StatusClass = 'failed';
export const PENDING_STATUS: StatusClass = 'pending';

export type NetworkFilters = {
  search: string;
  modes: SearchModes;
  invert: boolean;
  type: ResourceType | null;
  /**
   * Empty means every one of them. A comparison is normally between two — two methods, two clients —
   * so these take a set rather than the one value a chip used to hold.
   */
  methods: readonly string[];
  sources: readonly string[];
  /** An expression, not a band: `404`, `4xx`, `>= 400`, `200-299`, `failed`, `pending`. */
  statusQuery: string;
  /** As typed, with their units — `20kb`, `1.5s` — and read at the last moment. */
  minSize: string;
  maxSize: string;
  minDuration: string;
  maxDuration: string;
  inFlightOnly: boolean;
  interceptedOnly: boolean;
  hideDataUrls: boolean;
  hideFailed: boolean;
};

export const DEFAULT_NETWORK_FILTERS: NetworkFilters = {
  search: '',
  modes: DEFAULT_SEARCH_MODES,
  invert: false,
  type: null,
  methods: [],
  sources: [],
  statusQuery: '',
  minSize: '',
  maxSize: '',
  minDuration: '',
  maxDuration: '',
  inFlightOnly: false,
  interceptedOnly: false,
  hideDataUrls: false,
  hideFailed: false,
};

/**
 * The expressions read once per keystroke rather than once per row: parsing a status query and four
 * thresholds two hundred times over is the slowest thing a filter panel could do, and none of it
 * depends on the entry.
 */
export type CompiledNetworkFilters = {
  status: ParsedStatusQuery | null;
  minSize: number | null;
  maxSize: number | null;
  minDuration: number | null;
  maxDuration: number | null;
};

export function compileNetworkFilters(filters: NetworkFilters): CompiledNetworkFilters {
  return {
    status: parseStatusQuery(filters.statusQuery),
    minSize: parseByteSize(filters.minSize),
    maxSize: parseByteSize(filters.maxSize),
    minDuration: parseDurationMs(filters.minDuration),
    maxDuration: parseDurationMs(filters.maxDuration),
  };
}

/**
 * Typed, but not yet a filter. What the field shows as invalid, and the same reason it is not applied:
 * an expression on its way to being valid should not empty the list under the cursor.
 */
export function isUnreadable(text: string, parsed: number | ParsedStatusQuery | null): boolean {
  return text.trim().length > 0 && parsed === null;
}

export function statusClass(entry: NetworkLogEntry): StatusClass {
  if (entry.statusCode !== undefined) return `${Math.floor(entry.statusCode / 100)}xx`;
  return entry.status === 'error' ? FAILED_STATUS : PENDING_STATUS;
}

export function statusClassLabel(status: StatusClass): string {
  if (status === FAILED_STATUS) return 'Failed';
  if (status === PENDING_STATUS) return 'Pending';
  return status;
}

/** Code bands first and in order, then the two codeless states. */
export function sortStatusClasses(classes: StatusClass[]): StatusClass[] {
  const weight = (status: StatusClass) => {
    if (status === FAILED_STATUS) return 8;
    if (status === PENDING_STATUS) return 9;
    return Number.parseInt(status, 10);
  };
  return [...classes].sort((a, b) => weight(a) - weight(b));
}

export function matchesQuery(entry: NetworkLogEntry, matcher: Matcher | null): boolean {
  return testMatch(
    `${entry.method} ${entry.url} ${entry.statusCode ?? ''} ${entry.source ?? ''}`,
    matcher
  );
}

/**
 * A threshold an entry has no figure for excludes it, rather than letting it through: a socket has no
 * size and a request in flight has no duration yet, and neither is "under 20 kB".
 */
function withinThresholds(
  size: number | undefined,
  duration: number | undefined,
  compiled: CompiledNetworkFilters
): boolean {
  if (compiled.minSize !== null && (size === undefined || size < compiled.minSize)) return false;
  if (compiled.maxSize !== null && (size === undefined || size > compiled.maxSize)) return false;
  if (
    compiled.minDuration !== null &&
    (duration === undefined || duration < compiled.minDuration)
  ) {
    return false;
  }
  if (
    compiled.maxDuration !== null &&
    (duration === undefined || duration > compiled.maxDuration)
  ) {
    return false;
  }
  return true;
}

function matchesSelection(selected: readonly string[], value: string | undefined): boolean {
  return selected.length === 0 || (value !== undefined && selected.includes(value));
}

/**
 * `invert` negates what you asked *for* — search, type, methods, sources, status, the thresholds and
 * the two "only" toggles. The two hide toggles stay absolute: inverting them would resurrect the exact
 * noise they were flipped on to suppress.
 */
export function matchesFilters(
  entry: NetworkLogEntry,
  filters: NetworkFilters,
  matcher: Matcher | null,
  compiled: CompiledNetworkFilters
): boolean {
  if (filters.hideDataUrls && entry.url.startsWith('data:')) return false;
  if (filters.hideFailed && entry.status === 'error') return false;

  const matches =
    matchesSelection(filters.sources, entry.source) &&
    matchesSelection(filters.methods, entry.method) &&
    (filters.type === null || classifyResourceType(entry.mimeType) === filters.type) &&
    (compiled.status === null ||
      matchesStatusQuery(
        {
          statusCode: entry.statusCode,
          failed: entry.status === 'error',
          pending: entry.status === 'pending',
        },
        compiled.status
      )) &&
    withinThresholds(entry.size, entry.duration, compiled) &&
    (!filters.inFlightOnly || entry.status === 'pending') &&
    (!filters.interceptedOnly || entry.intercepted !== undefined) &&
    matchesQuery(entry, matcher);

  return filters.invert ? !matches : matches;
}

/**
 * A socket is in the same list but not in the same buckets: it has no resource type, no status code
 * and no size, so a filter on any of those excludes it rather than matching it loosely. Nothing
 * intercepts a socket either — the override rules are about requests.
 */
export function matchesSocketFilters(
  entry: WebSocketLogEntry,
  filters: NetworkFilters,
  matcher: Matcher | null,
  compiled: CompiledNetworkFilters
): boolean {
  if (filters.hideDataUrls && entry.url.startsWith('data:')) return false;
  if (filters.hideFailed && entry.status === 'error') return false;

  const matches =
    filters.type === null &&
    compiled.status === null &&
    !filters.interceptedOnly &&
    matchesSelection(filters.sources, entry.source) &&
    matchesSelection(filters.methods, entry.method) &&
    withinThresholds(undefined, entry.duration, compiled) &&
    (!filters.inFlightOnly || entry.status === 'connecting' || entry.status === 'open') &&
    testMatch(`${entry.method} ${entry.url} ${entry.status} ${entry.source ?? ''}`, matcher);

  return filters.invert ? !matches : matches;
}

export function hasActiveFilters(filters: NetworkFilters): boolean {
  return (
    filters.search.length > 0 ||
    filters.invert ||
    filters.type !== null ||
    filters.methods.length > 0 ||
    filters.sources.length > 0 ||
    filters.statusQuery.trim().length > 0 ||
    filters.minSize.trim().length > 0 ||
    filters.maxSize.trim().length > 0 ||
    filters.minDuration.trim().length > 0 ||
    filters.maxDuration.trim().length > 0 ||
    filters.inFlightOnly ||
    filters.interceptedOnly ||
    filters.hideDataUrls ||
    filters.hideFailed
  );
}
