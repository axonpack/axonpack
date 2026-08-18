import {
  defineStorageAdapter,
  resolveStorageAdapters,
  type StorageAdapterDefinition,
} from '../define-adapter.service';
import { readAdapter } from '../read-storage.service';
import { removeStorageKey, setStorageValue } from '../write-storage.service';
import { storageStore, type StorageEntry } from '../../../stores/storage/storage.store';

function mapDefinition(
  values: Record<string, string>,
  overrides: Partial<StorageAdapterDefinition> = {}
) {
  const map = new Map(Object.entries(values));
  const definition = defineStorageAdapter({
    name: 'Memory',
    kind: 'sync',
    getAllKeys: () => [...map.keys()],
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, text: string) => {
      map.set(key, text);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  });
  return { map, definition: { ...definition, ...overrides } };
}

function entriesOf(adapterId: string): StorageEntry[] {
  return (
    storageStore.getSnapshot().adapters.find((it) => it.adapter.id === adapterId)?.entries ?? []
  );
}

async function setup(
  values: Record<string, string>,
  overrides?: Partial<StorageAdapterDefinition>
) {
  const { map, definition } = mapDefinition(values, overrides);
  const [adapter] = resolveStorageAdapters([definition]);
  storageStore.setAdapters([adapter]);
  await readAdapter(adapter);
  return { map, adapter };
}

beforeEach(() => {
  storageStore.reset();
  storageStore.setEnabled(true);
});

describe('setStorageValue', () => {
  it('writes through and re-reads the one key it touched', async () => {
    const { map } = await setup({ a: '1', b: '2' });

    const error = await setStorageValue(entriesOf('memory')[0], 'changed');

    expect(error).toBeNull();
    expect(map.get('a')).toBe('changed');
    expect(entriesOf('memory').map((it) => it.text)).toEqual(['changed', '2']);
  });

  it('reclassifies and resizes the value it read back', async () => {
    await setup({ a: 'plain' });

    await setStorageValue(entriesOf('memory')[0], '{"nested":true}');
    const [updated] = entriesOf('memory');

    expect(updated.kind).toBe('json-object');
    expect(updated.size).toBe(15);
  });

  it('returns the driver message instead of throwing out of the save', async () => {
    const { definition } = mapDefinition({ a: '1' });
    const [adapter] = resolveStorageAdapters([
      {
        ...definition,
        setItem: async () => {
          throw new Error('disk full');
        },
      },
    ]);
    storageStore.setAdapters([adapter]);
    await readAdapter(adapter);

    await expect(setStorageValue(entriesOf('memory')[0], 'x')).resolves.toBe('disk full');
  });

  it('refuses to write to a store registered read-only', async () => {
    const { map, definition } = mapDefinition({ a: '1' });
    const [adapter] = resolveStorageAdapters([definition], { readOnly: true });
    storageStore.setAdapters([adapter]);
    await readAdapter(adapter);

    await expect(setStorageValue(entriesOf('memory')[0], 'x')).resolves.toMatch(/read-only/);
    expect(map.get('a')).toBe('1');
  });
});

describe('removeStorageKey', () => {
  it('deletes the key and drops it from the list', async () => {
    const { map } = await setup({ a: '1', b: '2' });

    const error = await removeStorageKey(entriesOf('memory')[0]);

    expect(error).toBeNull();
    expect(map.has('a')).toBe(false);
    expect(entriesOf('memory').map((it) => it.key)).toEqual(['b']);
  });

  it('keeps the key listed when the driver refuses', async () => {
    const { definition } = mapDefinition({ a: '1' });
    const [adapter] = resolveStorageAdapters([
      {
        ...definition,
        removeItem: async () => {
          throw new Error('locked');
        },
      },
    ]);
    storageStore.setAdapters([adapter]);
    await readAdapter(adapter);

    await expect(removeStorageKey(entriesOf('memory')[0])).resolves.toBe('locked');
    expect(entriesOf('memory')).toHaveLength(1);
  });

  it('refuses to delete from a store registered read-only', async () => {
    const { map, definition } = mapDefinition({ a: '1' });
    const [adapter] = resolveStorageAdapters([definition], { readOnly: true });
    storageStore.setAdapters([adapter]);
    await readAdapter(adapter);

    await expect(removeStorageKey(entriesOf('memory')[0])).resolves.toMatch(/read-only/);
    expect(map.has('a')).toBe(true);
  });
});
