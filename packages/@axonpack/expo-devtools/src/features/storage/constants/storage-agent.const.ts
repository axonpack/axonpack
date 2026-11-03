import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { runQuery, type AgentQuery } from '../../../agent/utils/run-query.util';
import { readAdapter, readUnreadEntries } from '../services/read-storage.service';
import { storageStore, type StorageEntry } from '../stores/storage.store';

/** The fields only a value read fills in. A filter, sort or group on one has to see every value. */
const READ_FIELDS = new Set(['value', 'type', 'size', 'error']);

const idOf = (entry: StorageEntry) => `${entry.adapterId}/${entry.key}`;

const rows = () => storageStore.getSnapshot().adapters.flatMap((state) => state.entries);

function needsEveryValue(query: AgentQuery): boolean {
  const named = [
    ...(query.where ?? []).map((clause) => /^[\w.-]*/.exec(clause)![0]),
    query.sort?.replace(/^-/, ''),
    query.groupBy,
  ];
  return Boolean(query.grep) || named.some((name) => name !== undefined && READ_FIELDS.has(name));
}

/**
 * The rows this list will return, found by running the same query for their ids alone, so the
 * paging rules live in one place. A bad query is left for the real run to report.
 */
function pageOf(query: AgentQuery): StorageEntry[] {
  const reply = runQuery([{ ...STORAGE_AGENT, prepare: undefined }], {
    ...query,
    fields: 'id',
    json: true,
    full: true,
    count: false,
    groupBy: undefined,
  }).text;
  if (reply.startsWith('error: ')) return [];
  const ids = new Set(
    reply
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line).id)
  );
  return rows().filter((entry) => ids.has(idOf(entry)));
}

/**
 * Starts reading the unread values among `entries`, through the same path as the tab, so they reach
 * the store already redacted. A key whose read is in flight is not read twice, so asking again while
 * waiting costs nothing.
 */
function readValues(entries: readonly StorageEntry[]): string | undefined {
  const unread = entries.filter((entry) => entry.kind === 'unread');
  if (unread.length === 0) return undefined;
  for (const adapterId of new Set(unread.map((entry) => entry.adapterId))) {
    readUnreadEntries(unread.filter((entry) => entry.adapterId === adapterId));
  }
  return `reading ${unread.length} value${unread.length === 1 ? '' : 's'}`;
}

/**
 * True while this topic's last reply was a `# wait:`, so the CLI asking again carries on from there
 * and the next new query lists the keys again.
 * ponytail: one flag for every caller, so a query that comes in while another waits, or right after
 * one the CLI gave up on, sees the keys of that listing. A query id from the CLI would tell them
 * apart, if that ever matters.
 */
let waiting = false;

function prepare(query: AgentQuery): string | undefined {
  const reply = waitFor(query);
  waiting = reply !== undefined;
  return reply;
}

/**
 * Lists every store's keys at the start of each query, since the app may have written keys since
 * the last one. Values already read stay, so that costs one key listing per store. Then a list reads
 * the values of the page it returns, as the DevTools tab reads the rows it draws, and a search over
 * values reads every key once. Values stay in the store after, as the tab keeps them, so the next
 * search reads nothing.
 */
function waitFor(query: AgentQuery): string | undefined {
  for (const state of storageStore.getSnapshot().adapters) {
    if (state.status === 'idle' || (!waiting && state.status !== 'reading')) {
      readAdapter(state.adapter, true);
    }
  }
  const listing = storageStore.getSnapshot().adapters.filter((state) => state.status === 'reading');
  if (listing.length > 0) {
    return `listing the keys of ${listing.map((state) => state.adapter.id).join(', ')}`;
  }
  if (query.get !== undefined) return readValues(rows().filter((e) => idOf(e) === query.get));
  return readValues(needsEveryValue(query) ? rows() : pageOf(query));
}

export const STORAGE_AGENT: AgentTopic<StorageEntry> = {
  name: 'storage',
  about:
    'keys and values of every registered store, by store then key (id is store/key). A list reads the values on its page; --grep or a filter on value reads every key once',
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
