import {
  defineStorageAdapter,
  resolveStorageAdapters,
} from '../../../services/storage/define-adapter.service';
import { storageStore, type StorageEntry } from '../storage.store';

function registerTwo() {
  storageStore.setAdapters(
    resolveStorageAdapters([
      defineStorageAdapter({ name: 'One', keys: [], getItem: () => null }),
      defineStorageAdapter({ name: 'Two', keys: [], getItem: () => null }),
    ])
  );
}

function entry(key: string, text: string | null): StorageEntry {
  return { adapterId: 'one', key, text, valueType: 'string', kind: 'string', size: 0 };
}

function stateOf(adapterId: string) {
  const state = storageStore.getSnapshot().adapters.find((it) => it.adapter.id === adapterId);
  if (!state) throw new Error(`no state for ${adapterId}`);
  return state;
}

beforeEach(() => {
  storageStore.reset();
  storageStore.setEnabled(true);
  registerTwo();
});

describe('storageStore registration', () => {
  it('starts every registered store idle and empty', () => {
    expect(storageStore.getSnapshot().adapters.map((state) => state.status)).toEqual([
      'idle',
      'idle',
    ]);
    expect(storageStore.getAdapters().map((adapter) => adapter.id)).toEqual(['one', 'two']);
  });

  it('finds an adapter by id and nothing by an unknown one', () => {
    expect(storageStore.findAdapter('two')?.name).toBe('Two');
    expect(storageStore.findAdapter('three')).toBeUndefined();
  });
});

describe('storageStore enabled gate', () => {
  it('accepts no entries until enabled', () => {
    storageStore.setEnabled(false);
    storageStore.setEntries('one', [entry('a', '1')], {
      truncated: false,
      totalKeys: 1,
      readAt: 0,
    });

    expect(stateOf('one').entries).toHaveLength(0);
  });
});

describe('storageStore snapshot identity', () => {
  it('publishes a new snapshot when a store changes', () => {
    const before = storageStore.getSnapshot();
    storageStore.beginRead('one');
    expect(storageStore.getSnapshot()).not.toBe(before);
  });

  it('returns the same snapshot when nothing is read', () => {
    const first = storageStore.getSnapshot();
    expect(storageStore.getSnapshot()).toBe(first);
  });

  it('leaves the untouched store holding the same array when another is updated', () => {
    const untouched = stateOf('two').entries;
    storageStore.setEntries('one', [entry('a', '1')], {
      truncated: false,
      totalKeys: 1,
      readAt: 0,
    });

    expect(stateOf('two').entries).toBe(untouched);
  });
});

describe('storageStore per-key updates', () => {
  beforeEach(() => {
    storageStore.setEntries('one', [entry('a', '1'), entry('b', '2')], {
      truncated: false,
      totalKeys: 2,
      readAt: 0,
    });
  });

  it('replaces an existing key in place', () => {
    storageStore.patchEntry('one', entry('a', 'changed'));

    expect(stateOf('one').entries.map((it) => [it.key, it.text])).toEqual([
      ['a', 'changed'],
      ['b', '2'],
    ]);
  });

  it('appends a key it has never seen', () => {
    storageStore.patchEntry('one', entry('c', '3'));
    expect(stateOf('one').entries).toHaveLength(3);
  });

  it('removes a key and takes it off the total', () => {
    storageStore.removeEntry('one', 'a');

    expect(stateOf('one').entries.map((it) => it.key)).toEqual(['b']);
    expect(stateOf('one').totalKeys).toBe(1);
  });

  it('ignores an update aimed at a store that is not registered', () => {
    storageStore.patchEntry('nope', entry('a', 'x'));
    expect(stateOf('one').entries).toHaveLength(2);
  });
});

describe('storageStore read failures', () => {
  it('keeps the message so the tab can show a reason instead of an empty list', () => {
    storageStore.failRead('one', 'store not ready');

    expect(stateOf('one').status).toBe('error');
    expect(stateOf('one').error).toBe('store not ready');
  });

  it('clears a previous error when a fresh read starts', () => {
    storageStore.failRead('one', 'store not ready');
    storageStore.beginRead('one');

    expect(stateOf('one').status).toBe('reading');
    expect(stateOf('one').error).toBeUndefined();
  });
});
