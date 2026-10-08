import type { Palette } from '../../../core/constants/theme.const';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import type { QueryRow } from '../stores/query.store';

/**
 * One word for a row. What the fetch is doing wins over what the data is, the way TanStack's own
 * devtools reads: a query refetching in the background is `fetching`, not `success`.
 */
export function queryStatusLabel(row: QueryRow): string {
  if (row.fetchStatus === 'fetching' || row.fetchStatus === 'paused') return row.fetchStatus;
  if (row.status === 'success' && row.stale) return 'stale';
  if (row.status === 'success' && row.observers === 0) return 'inactive';
  return row.status;
}

export function statusColor(palette: Palette, label: string): string {
  switch (label) {
    case 'error':
      return palette.error;
    case 'success':
      return palette.success;
    case 'fetching':
    case 'pending':
      return palette.pending;
    case 'paused':
    case 'stale':
      return palette.warning;
    default:
      return palette.textSecondary;
  }
}

export function formatKey(key: readonly unknown[] | undefined, fallback: string): string {
  if (!key) return fallback;
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

export function formatClockTime(timestamp: number): string {
  return timestamp > 0 ? new Date(timestamp).toTimeString().slice(0, 8) : 'never';
}

/**
 * The tree takes JSON, and query data is whatever the app's fetcher returned: a `Date`, a class
 * instance, a cycle. A JSON round trip is the shape the app would see over the wire anyway.
 */
export function toJsonValue(value: unknown): JsonValue {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    const text = JSON.stringify(value);
    return text === undefined ? String(value) : (JSON.parse(text) as JsonValue);
  } catch {
    return String(value);
  }
}
