import { EventEmitter } from 'expo';

import type {
  StorageAdapter,
  StorageValueType,
} from '../../services/storage/define-adapter.service';
import type { StoredValueKind } from '../../utils/storage/classify-value.util';

export type StorageEntry = {
  adapterId: string;
  key: string;
  /** `null` is an absent key. `''` is a value. */
  text: string | null;
  valueType: StorageValueType;
  /** Classified once at read time — see `classifyStoredValue`, which parses JSON to get here. */
  kind: StoredValueKind;
  /** UTF-8 bytes of `text` — what the store is actually billed for, not `text.length`. */
  size: number;
  /** Set when this one key failed to read; SecureStore throws on a value it can't decrypt. */
  error?: string;
};

export type StorageAdapterStatus = 'idle' | 'reading' | 'ready' | 'error';

export type StorageAdapterState = {
  adapter: StorageAdapter;
  entries: StorageEntry[];
  status: StorageAdapterStatus;
  error?: string;
  /** The read stopped at the key cap. `totalKeys` is how many the store really holds. */
  truncated: boolean;
  totalKeys: number;
  readAt?: number;
};

export type StorageSnapshot = {
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
  /** Upserts one key after an edit, so a save doesn't re-read the whole store. */
  patchEntry(adapterId: string, entry: StorageEntry) {
    const state = snapshot.adapters.find((current) => current.adapter.id === adapterId);
    if (!state) return;

    const index = state.entries.findIndex((current) => current.key === entry.key);
    const entries =
      index === -1
        ? [...state.entries, entry]
        : state.entries.map((current, at) => (at === index ? entry : current));

    patchState(adapterId, { entries });
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
