import { EventEmitter } from 'expo';

import type { StorageAdapter, StorageValueType } from '../services/define-adapter.service';
import type { StoredValueKind } from '../utils/classify-value.util';

/**
 * One key and value read from a registered store — a row in the Storage tab. Read them from
 * `devtools.storageStore.getSnapshot()`; nothing is read until the tab is opened or Refresh is
 * pressed, since a pull costs only what it reads.
 */
export type StorageEntry = {
  /** Which registered store it came from — `StorageAdapter.id`. */
  adapterId: string;
  /** The key, as the store reported it. */
  key: string;
  /** `null` is an absent key. `''` is a value. */
  text: string | null;
  /** What the driver typed the value as. Drives how an edit is written back. */
  valueType: StorageValueType;
  /** Classified once at read time — see `classifyStoredValue`, which parses JSON to get here. */
  kind: StoredValueKind;
  /** UTF-8 bytes of `text` — what the store is actually billed for, not `text.length`. */
  size: number;
  /** Set when this one key failed to read; SecureStore throws on a value it can't decrypt. */
  error?: string;
};

/**
 * Where a store's read got to: `'idle'` before the tab has read it, `'reading'` while it is,
 * `'ready'` once entries are in, `'error'` when the driver threw.
 */
export type StorageAdapterStatus = 'idle' | 'reading' | 'ready' | 'error';

/** One registered store and the last read of it. */
export type StorageAdapterState = {
  /** The store itself — name, id, and what it is allowed to do. */
  adapter: StorageAdapter;
  /** The keys read, sorted by key. Empty until the first read. */
  entries: StorageEntry[];
  /** Where that read got to. */
  status: StorageAdapterStatus;
  /** Why the read failed, when it did. */
  error?: string;
  /** The read stopped at the key cap. `totalKeys` is how many the store really holds. */
  truncated: boolean;
  /** How many keys the store holds, even when only `storage.maxKeys` of them were read. */
  totalKeys: number;
  /** When the last read finished, as `Date.now()` milliseconds. Absent before the first one. */
  readAt?: number;
};

/** Every registered store and its last read — what `devtools.storageStore.getSnapshot()` returns. */
export type StorageSnapshot = {
  /** One entry per registered adapter, in the order they were registered. */
  adapters: StorageAdapterState[];
};

type StorageEvents = {
  change: () => void;
};

const EMPTY_SNAPSHOT: StorageSnapshot = { adapters: [] };

let snapshot: StorageSnapshot = EMPTY_SNAPSHOT;

/**
 * Same disabled-until-`init()` gate as every other store here. Nothing in this feature reads a
 * single key before `init()` runs, which is what makes shipping the tab to production free.
 *
 * There is deliberately **no `paused` flag**. The other three tabs pause a stream that costs
 * something continuously; storage is a pull, so its cost is per read and its toolbar carries a
 * Refresh button where theirs carry a record button.
 */
let enabled = false;

const emitter = new EventEmitter<StorageEvents>();

function replace(adapters: StorageAdapterState[]) {
  snapshot = { adapters };
  emitter.emit('change');
}

function patchState(adapterId: string, patch: Partial<StorageAdapterState>) {
  replace(
    snapshot.adapters.map((state) =>
      state.adapter.id === adapterId ? { ...state, ...patch } : state
    )
  );
}

export const storageStore = {
  getSnapshot(): StorageSnapshot {
    return snapshot;
  },
  isEnabled(): boolean {
    return enabled;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  setEnabled(nextEnabled: boolean) {
    enabled = nextEnabled;
    emitter.emit('change');
  },
  setAdapters(adapters: StorageAdapter[]) {
    replace(
      adapters.map((adapter) => ({
        adapter,
        entries: [],
        status: 'idle',
        truncated: false,
        totalKeys: 0,
      }))
    );
  },
  getAdapters(): StorageAdapter[] {
    return snapshot.adapters.map((state) => state.adapter);
  },
  findAdapter(adapterId: string): StorageAdapter | undefined {
    return snapshot.adapters.find((state) => state.adapter.id === adapterId)?.adapter;
  },
  beginRead(adapterId: string) {
    if (!enabled) return;
    patchState(adapterId, { status: 'reading', error: undefined });
  },
  setEntries(
    adapterId: string,
    entries: StorageEntry[],
    meta: { truncated: boolean; totalKeys: number; readAt: number }
  ) {
    if (!enabled) return;
    patchState(adapterId, {
      entries,
      status: 'ready',
      error: undefined,
      truncated: meta.truncated,
      totalKeys: meta.totalKeys,
      readAt: meta.readAt,
    });
  },
  failRead(adapterId: string, message: string) {
    if (!enabled) return;
    patchState(adapterId, { status: 'error', error: message });
  },
  /**
   * Upserts one key after a write, so a save doesn't re-read the whole store. A key that wasn't
   * there is a key the store didn't hold a moment ago, so the total moves with it — otherwise the
   * summary reads one short until the next refresh.
   */
  patchEntry(adapterId: string, entry: StorageEntry) {
    const state = snapshot.adapters.find((current) => current.adapter.id === adapterId);
    if (!state) return;

    const index = state.entries.findIndex((current) => current.key === entry.key);
    const entries =
      index === -1
        ? [...state.entries, entry]
        : state.entries.map((current, at) => (at === index ? entry : current));

    patchState(adapterId, {
      entries,
      totalKeys: index === -1 ? state.totalKeys + 1 : state.totalKeys,
    });
  },
  removeEntry(adapterId: string, key: string) {
    const state = snapshot.adapters.find((current) => current.adapter.id === adapterId);
    if (!state) return;

    patchState(adapterId, {
      entries: state.entries.filter((entry) => entry.key !== key),
      totalKeys: Math.max(0, state.totalKeys - 1),
    });
  },
  /** Test-only reset; the panel has no way to unregister a store. */
  reset() {
    enabled = false;
    snapshot = EMPTY_SNAPSHOT;
    emitter.emit('change');
  },
};
