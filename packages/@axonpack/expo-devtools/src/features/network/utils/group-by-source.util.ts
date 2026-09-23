import type { NetworkEntry } from '../stores/network-log.store';

export type SourceGroup = { title: string; data: NetworkEntry[] };

/** Groups keep the order of their first entry, so a sorted list stays sorted inside each group. */
export function groupBySource(entries: readonly NetworkEntry[]): SourceGroup[] {
  const bySource = new Map<string, NetworkEntry[]>();
  for (const entry of entries) {
    const key = entry.source ?? 'unknown';
    const list = bySource.get(key) ?? [];
    list.push(entry);
    bySource.set(key, list);
  }
  return Array.from(bySource.entries()).map(([title, data]) => ({ title, data }));
}
