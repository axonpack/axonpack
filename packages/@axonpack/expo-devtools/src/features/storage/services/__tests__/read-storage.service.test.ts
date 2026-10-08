import {
  defineStorageAdapter,
  resolveStorageAdapters,
  type StorageAdapter,
  type StorageAdapterDefinition,
} from '../define-adapter.service';
import {
  readAdapter,
  readAllAdapters,
  readUnreadEntries,
  SHOWN_FOR_MS,
  showStorageRows,
  readStorageKey,
  watchStorageAdapters,
} from '../read-storage.service';
import { storageStore } from '../../stores/storage.store';

function register(definition: StorageAdapterDefinition): StorageAdapter {
  const adapters = resolveStorageAdapters([definition]);
  storageStore.setAdapters(adapters);
  return adapters[0];
}

function stateOf(adapterId: string) {
  const state = storageStore.getSnapshot().adapters.find((it) => it.adapter.id === adapterId);
  if (!state) throw new Error(`no state for ${adapterId}`);
  return state;
}

function mapDefinition(values: Record<string, string>): StorageAdapterDefinition {
  const map = new Map(Object.entries(values));
  return defineStorageAdapter({
    name: 'Memory',
    kind: 'sync',
    getAllKeys: () => [...map.keys()],
    getItem: (key: string) => map.get(key) ?? null,
  });
}

/** A store of `count` keys that counts its reads, batched or not. */
function bigStore(count: number) {
  const keys = Array.from({ length: count }, (_, index) => `key-${String(index).padStart(5, '0')}`);
  const getItem = jest.fn((key: string) => `value of ${key}`);
  const getMany = jest.fn((batch: readonly string[]) => {
    return new Map(
      batch.map((key) => [key, { text: `value of ${key}`, valueType: 'string' as const }])
    );
  });
  const adapter = register(
    defineStorageAdapter({ name: 'Big', getAllKeys: () => keys, getItem, getMany })
  );
  return { adapter, getItem, getMany };
}

async function readWhole(adapter: StorageAdapter) {
  await readAdapter(adapter);
  await readUnreadEntries(stateOf(adapter.id).entries);
}

beforeEach(() => {
  storageStore.reset();
  storageStore.setEnabled(true);
  showStorageRows([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('readAdapter', () => {
  it('lists every key, sorted, and reads no value', async () => {
    const getItem = jest.fn(() => 'x');
    const adapter = register(
      defineStorageAdapter({ name: 'Lazy', getAllKeys: () => ['b', 'a'], getItem })
    );

    await readAdapter(adapter);
    const state = stateOf(adapter.id);

    expect(state.status).toBe('ready');
    expect(state.entries.map((entry) => [entry.key, entry.kind, entry.text])).toEqual([
      ['a', 'unread', null],
      ['b', 'unread', null],
    ]);
    expect(state.totalKeys).toBe(2);
    expect(getItem).not.toHaveBeenCalled();
  });

  it('opens a 10,000-key store without reading a single value', async () => {
    const { adapter, getItem, getMany } = bigStore(10000);

    await readAdapter(adapter);

    expect(stateOf(adapter.id).entries).toHaveLength(10000);
    expect(getItem).not.toHaveBeenCalled();
    expect(getMany).not.toHaveBeenCalled();
  });

  it('reads nothing at all until the store is enabled', async () => {
    const getAllKeys = jest.fn(() => ['a']);
    const adapter = register(
      defineStorageAdapter({ name: 'Gated', getAllKeys, getItem: () => 'x' })
    );
    storageStore.setEnabled(false);

    await readAdapter(adapter);

    expect(getAllKeys).not.toHaveBeenCalled();
  });

  it('surfaces a failure to list the keys as the adapter failing', async () => {
    const adapter = register(
      defineStorageAdapter({
        name: 'Broken',
        getAllKeys: () => {
          throw new Error('store not ready');
        },
        getItem: () => null,
      })
    );

    await readAdapter(adapter);

    expect(stateOf(adapter.id).status).toBe('error');
    expect(stateOf(adapter.id).error).toBe('store not ready');
  });

  it('re-reads the rows on screen after a refresh, and nothing else', async () => {
    jest.useFakeTimers();
    const { adapter, getMany } = bigStore(100);
    await readAdapter(adapter);
    const shown = stateOf(adapter.id).entries.slice(0, 3);
    showStorageRows(shown);
    jest.advanceTimersByTime(SHOWN_FOR_MS);
    await readUnreadEntries(shown);
    getMany.mockClear();

    await readAdapter(adapter);

    expect(getMany.mock.calls).toEqual([[shown.map((entry) => entry.key)]]);
    expect(stateOf(adapter.id).entries.filter((entry) => entry.kind !== 'unread')).toHaveLength(3);
  });
});

describe('readUnreadEntries', () => {
  it('sizes the values it reads in bytes', async () => {
    const adapter = register(mapDefinition({ b: 'two', a: 'é' }));

    await readWhole(adapter);

    expect(stateOf(adapter.id).entries.map((entry) => [entry.key, entry.size])).toEqual([
      ['a', 2],
      ['b', 3],
    ]);
  });

  it('reads each unread key once, even when two callers ask at the same time', async () => {
    const { adapter, getMany } = bigStore(3);
    await readAdapter(adapter);
    const wanted = stateOf(adapter.id).entries.slice(0, 2);

    const [first, second] = await Promise.all([
      readUnreadEntries(wanted),
      readUnreadEntries(wanted),
    ]);

    expect(getMany.mock.calls).toEqual([[['key-00000', 'key-00001']]]);
    expect(first.map((entry) => entry.text)).toEqual(['value of key-00000', 'value of key-00001']);
    expect(second).toEqual(first);
    expect(stateOf(adapter.id).entries.map((entry) => entry.kind)).toEqual([
      'string',
      'string',
      'unread',
    ]);
  });

  it('keeps the other keys when one key throws, and records why', async () => {
    const adapter = register(
      defineStorageAdapter({
        name: 'Partly broken',
        getAllKeys: () => ['bad', 'good'],
        getItem: (key: string) => {
          if (key === 'bad') throw new Error('cannot decrypt');
          return 'fine';
        },
      })
    );

    await readWhole(adapter);
    const [bad, good] = stateOf(adapter.id).entries;

    expect(stateOf(adapter.id).status).toBe('ready');
    expect(bad.error).toBe('cannot decrypt');
    expect(bad.text).toBeNull();
    expect(good.text).toBe('fine');
  });

  it('prefers a batch read, and falls back per key when the batch throws', async () => {
    const getMany = jest.fn(async () => {
      throw new Error('batch exploded');
    });
    const getItem = jest.fn((key: string) => `value-${key}`);
    const adapter = register(
      defineStorageAdapter({ name: 'Batched', getAllKeys: () => ['a', 'b'], getItem, getMany })
    );

    await readWhole(adapter);

    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledTimes(2);
    expect(stateOf(adapter.id).entries.map((entry) => entry.text)).toEqual(['value-a', 'value-b']);
  });

  it('drops a listed key the batch says is gone', async () => {
    const adapter = register(
      defineStorageAdapter({
        name: 'Sparse',
        getAllKeys: () => ['a', 'b'],
        getItem: () => 'never used',
        getMany: () => new Map([['a', { text: 'only a', valueType: 'string' as const }]]),
      })
    );

    await readWhole(adapter);

    expect(stateOf(adapter.id).entries.map((entry) => entry.text)).toEqual(['only a']);
    expect(stateOf(adapter.id).totalKeys).toBe(1);
  });
});

describe('showStorageRows', () => {
  it('reads a screen of rows in one batch once they have stayed on screen', async () => {
    jest.useFakeTimers();
    const { adapter, getItem, getMany } = bigStore(10000);
    await readAdapter(adapter);
    const screen = stateOf(adapter.id).entries.slice(500, 515);

    showStorageRows(screen);
    expect(getMany).not.toHaveBeenCalled();
    jest.advanceTimersByTime(SHOWN_FOR_MS);
    await readUnreadEntries(screen);

    expect(getMany.mock.calls).toEqual([[screen.map((entry) => entry.key)]]);
    expect(getItem).not.toHaveBeenCalled();
    expect(stateOf(adapter.id).entries.filter((entry) => entry.kind !== 'unread')).toHaveLength(15);
  });

  it('never reads rows a scroll moved past before their read was due', async () => {
    jest.useFakeTimers();
    const { adapter, getMany } = bigStore(1000);
    await readAdapter(adapter);
    const entries = stateOf(adapter.id).entries;

    showStorageRows(entries.slice(0, 15));
    jest.advanceTimersByTime(SHOWN_FOR_MS / 3);
    showStorageRows(entries.slice(100, 115));
    jest.advanceTimersByTime(SHOWN_FOR_MS / 3);
    const resting = entries.slice(200, 215);
    showStorageRows(resting);
    jest.advanceTimersByTime(SHOWN_FOR_MS);
    await readUnreadEntries(resting);

    expect(getMany.mock.calls).toEqual([[resting.map((entry) => entry.key)]]);
  });
});

describe('readAllAdapters', () => {
  it('lists every registered store', async () => {
    storageStore.setAdapters(
      resolveStorageAdapters([mapDefinition({ a: '1' }), mapDefinition({ b: '2' })])
    );

    await readAllAdapters();

    expect(storageStore.getSnapshot().adapters.map((state) => state.status)).toEqual([
      'ready',
      'ready',
    ]);
  });
});

describe('live updates', () => {
  function liveMap(values: Record<string, string>) {
    const map = new Map(Object.entries(values));
    const listeners = new Set<(key: string) => void>();
    const getItem = jest.fn((key: string) => map.get(key) ?? null);
    const definition = defineStorageAdapter({
      name: 'Live',
      getAllKeys: () => [...map.keys()],
      getItem,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });
    function write(key: string, value: string | null) {
      if (value === null) map.delete(key);
      else map.set(key, value);
      listeners.forEach((listener) => listener(key));
    }
    return { definition, getItem, listeners, write };
  }

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('re-reads a changed key it has read, lists a new one unread, and drops a deleted one', async () => {
    const { definition, getItem, write } = liveMap({ a: '1', b: '2' });
    const adapter = register(definition);
    await readWhole(adapter);
    const stop = watchStorageAdapters();
    getItem.mockClear();

    write('a', 'changed');
    write('c', '3');
    write('b', null);
    await flush();
    stop();

    const state = stateOf(adapter.id);
    expect(state.entries.map((entry) => [entry.key, entry.kind, entry.text])).toEqual([
      ['a', 'string', 'changed'],
      ['c', 'unread', null],
    ]);
    expect(state.totalKeys).toBe(2);
    expect(getItem.mock.calls).toEqual([['a'], ['b']]);
  });

  it('stops listening when the tab closes', async () => {
    const { definition, listeners } = liveMap({ a: '1' });
    register(definition);

    const stop = watchStorageAdapters();
    expect(listeners.size).toBe(1);
    stop();
    expect(listeners.size).toBe(0);
  });

  it('leaves a store alone until its first read is in', async () => {
    const { definition } = liveMap({ a: '1' });
    const adapter = register(definition);

    await readStorageKey(adapter, 'a');

    expect(stateOf(adapter.id).entries).toHaveLength(0);
  });

  it('reads nothing for a change to an unread key that is off screen', async () => {
    const { definition, getItem, write } = liveMap({ a: '1', b: '2' });
    const adapter = register(definition);
    await readAdapter(adapter);
    const stop = watchStorageAdapters();

    write('b', 'changed');
    write('b', null);
    await flush();
    stop();

    expect(getItem).not.toHaveBeenCalled();
    expect(stateOf(adapter.id).entries.map((entry) => entry.kind)).toEqual(['unread', 'unread']);
  });

  it('reads a change to an unread key whose row is on screen', async () => {
    jest.useFakeTimers();
    const { definition, getItem } = liveMap({ a: '1', b: '2' });
    const adapter = register(definition);
    await readAdapter(adapter);
    showStorageRows(stateOf(adapter.id).entries.slice(1));

    await readStorageKey(adapter, 'b');

    expect(getItem.mock.calls).toEqual([['b']]);
    expect(stateOf(adapter.id).entries.map((entry) => [entry.key, entry.text])).toEqual([
      ['a', null],
      ['b', '2'],
    ]);
  });
});
