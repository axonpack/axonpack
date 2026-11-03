import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import type { AgentQuery } from '../../../agent/utils/run-query.util';
import { readAdapter, readUnreadEntries } from '../services/read-storage.service';
import { storageStore, type StorageEntry } from '../stores/storage.store';

const idOf = (entry: StorageEntry) => `${entry.adapterId}/${entry.key}`;

const rows = () => storageStore.getSnapshot().adapters.flatMap((state) => state.entries);

/**
 * Lists a store's keys the first time it is asked about, as opening the tab does, and reads one
 * value for a `get`. Lists never read values: a store can hold thousands of keys, so a list shows
 * a value only once something has read it.
 */
function prepare(query: AgentQuery): string | undefined {
  const unlisted = storageStore
    .getSnapshot()
    .adapters.filter((state) => state.status === 'idle' || state.status === 'reading');
  for (const state of unlisted) if (state.status === 'idle') readAdapter(state.adapter);
  if (unlisted.length > 0) {
    return `listing the keys of ${unlisted.map((state) => state.adapter.id).join(', ')}`;
  }
  if (query.get === undefined) return undefined;
  const entry = rows().find((each) => idOf(each) === query.get);
  if (entry?.kind !== 'unread') return undefined;
  readUnreadEntries([entry]);
  return `reading ${query.get}`;
}

export const STORAGE_AGENT: AgentTopic<StorageEntry> = {
  name: 'storage',
  about:
    'keys of every registered store, by store then key (id is store/key). A list shows a value once read; get reads it',
  rows,
  enabled: () => storageStore.isEnabled() && storageStore.getAdapters().length > 0,
  off: 'no stores in config.storage.adapters',
  prepare,
  fields: {
    id: idOf,
    t: () => undefined,
    store: (e) => e.adapterId,
    key: (e) => e.key,
    type: (e) => e.kind,
    size: (e) => (e.kind === 'unread' ? undefined : e.size),
    value: (e) => e.text,
    error: (e) => e.error,
  },
  show: ['id', 'type', 'value'],
};
