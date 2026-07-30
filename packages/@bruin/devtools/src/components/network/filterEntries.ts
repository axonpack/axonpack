import type { NetworkLogEntry } from '../../utils/network/networkLogStore';

export function matchesQuery(entry: NetworkLogEntry, query: string): boolean {
  if (!query) return true;
  const haystack =
    `${entry.method} ${entry.url} ${entry.statusCode ?? ''} ${entry.source ?? ''}`.toLowerCase();
  return haystack.includes(query);
}
