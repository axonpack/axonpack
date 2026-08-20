import { classifyResourceType, type ResourceType } from './resource-type.util';
import type { NetworkLogEntry } from '../stores/network-log.store';
import {
  DEFAULT_SEARCH_MODES,
  testMatch,
  type Matcher,
  type SearchModes,
} from '../../../core/utils/text-search.util';

/** A `2xx`-style band, or the two states that have no code of their own. */
export type StatusClass = string;

export const FAILED_STATUS: StatusClass = 'failed';
export const PENDING_STATUS: StatusClass = 'pending';

export type NetworkFilters = {
  search: string;
  modes: SearchModes;
  invert: boolean;
  type: ResourceType | null;
  method: string | null;
  source: string | null;
  status: StatusClass | null;
  hideDataUrls: boolean;
  hideFailed: boolean;
};

export const DEFAULT_NETWORK_FILTERS: NetworkFilters = {
  search: '',
  modes: DEFAULT_SEARCH_MODES,
  invert: false,
  type: null,
  method: null,
  source: null,
  status: null,
  hideDataUrls: false,
  hideFailed: false,
};

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
 * `invert` negates what you asked *for* — search, type, method, source, status. The two hide
 * toggles stay absolute: inverting them would resurrect the exact noise they were flipped on to
 * suppress.
 */
export function matchesFilters(
  entry: NetworkLogEntry,
  filters: NetworkFilters,
  matcher: Matcher | null
): boolean {
  if (filters.hideDataUrls && entry.url.startsWith('data:')) return false;
  if (filters.hideFailed && entry.status === 'error') return false;

  const matches =
    (filters.source === null || entry.source === filters.source) &&
    (filters.method === null || entry.method === filters.method) &&
    (filters.type === null || classifyResourceType(entry.mimeType) === filters.type) &&
    (filters.status === null || statusClass(entry) === filters.status) &&
    matchesQuery(entry, matcher);

  return filters.invert ? !matches : matches;
}

export function hasActiveFilters(filters: NetworkFilters): boolean {
  return (
    filters.search.length > 0 ||
    filters.invert ||
    filters.type !== null ||
    filters.method !== null ||
    filters.source !== null ||
    filters.status !== null ||
    filters.hideDataUrls ||
    filters.hideFailed
  );
}
