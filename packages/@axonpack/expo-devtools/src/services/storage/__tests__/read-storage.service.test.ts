import {
  defineStorageAdapter,
  resolveStorageAdapters,
  type StorageAdapter,
  type StorageAdapterDefinition,
} from '../define-adapter.service';
import { configureStorageReads, readAdapter, readAllAdapters } from '../read-storage.service';
import { storageStore } from '../../../stores/storage/storage.store';

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

beforeEach(() => {
  storageStore.reset();
  storageStore.setEnabled(true);
  configureStorageReads({ maxKeys: 1000 });
});

describe('readAdapter', () => {
  it('reads every key, sorted, and sizes the values in bytes', async () => {
    const adapter = register(mapDefinition({ b: 'two', a: 'é' }));

    await readAdapter(adapter);
    const state = stateOf(adapter.id);

    expect(state.status).toBe('ready');
    expect(state.entries.map((entry) => entry.key)).toEqual(['a', 'b']);
    expect(state.entries[0].size).toBe(2);
    expect(state.totalKeys).toBe(2);
    expect(state.truncated).toBe(false);
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

  it('stops at the key cap and reports the real total rather than truncating silently', async () => {
    configureStorageReads({ maxKeys: 2 });
    const adapter = register(mapDefinition({ a: '1', b: '2', c: '3', d: '4' }));

    await readAdapter(adapter);
    const state = stateOf(adapter.id);

    expect(state.entries).toHaveLength(2);
    expect(state.truncated).toBe(true);
    expect(state.totalKeys).toBe(4);
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

    await readAdapter(adapter);
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

    await readAdapter(adapter);

    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledTimes(2);
    expect(stateOf(adapter.id).entries.map((entry) => entry.text)).toEqual(['value-a', 'value-b']);
  });

  it('treats a key the batch left out as unset', async () => {
    const adapter = register(
      defineStorageAdapter({
        name: 'Sparse',
        getAllKeys: () => ['a', 'b'],
        getItem: () => 'never used',
        getMany: () => new Map([['a', { text: 'only a', valueType: 'string' as const }]]),
      })
    );

    await readAdapter(adapter);

    expect(stateOf(adapter.id).entries.map((entry) => entry.text)).toEqual(['only a', null]);
  });
});

describe('readAllAdapters', () => {
  it('reads every registered store', async () => {
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
