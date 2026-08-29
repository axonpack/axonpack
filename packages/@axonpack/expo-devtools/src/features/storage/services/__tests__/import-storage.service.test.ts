import { storageStore } from '../../stores/storage.store';
import {
  buildStorageExport,
  planStorageImport,
  type StorageImportPlan,
} from '../../utils/build-storage-export.util';
import { defineStorageAdapter, resolveStorageAdapters } from '../define-adapter.service';
import { applyStorageImport } from '../import-storage.service';
import { readAdapter } from '../read-storage.service';

function setup(values: Record<string, string>, options: { failOn?: string } = {}) {
  const map = new Map(Object.entries(values));
  const [adapter] = resolveStorageAdapters([
    defineStorageAdapter({
      name: 'Memory',
      kind: 'sync',
      getAllKeys: () => [...map.keys()],
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, text: string) => {
        if (key === options.failOn) throw new Error('locked');
        map.set(key, text);
      },
    }),
  ]);
  storageStore.setAdapters([adapter]);
  return { map, adapter };
}

function planFor(entries: Record<string, string>): StorageImportPlan {
  const [source] = resolveStorageAdapters([
    defineStorageAdapter({ name: 'Memory', getAllKeys: () => [], getItem: () => null }),
  ]);
  const file = buildStorageExport(
    source,
    Object.entries(entries).map(([key, text]) => ({
      adapterId: 'memory',
      key,
      text,
      valueType: 'string' as const,
      kind: 'string' as const,
      size: text.length,
    })),
    '2026-08-28T00:00:00.000Z'
  );
  const current = storageStore.getSnapshot().adapters[0];
  return planStorageImport(file, current.adapter, current.entries);
}

beforeEach(() => {
  storageStore.reset();
  storageStore.setEnabled(true);
});

describe('applyStorageImport', () => {
  it('writes the accepted keys and re-reads the store afterwards', async () => {
    const { map, adapter } = setup({ existing: 'old' });
    await readAdapter(adapter);

    const result = await applyStorageImport('memory', planFor({ existing: 'new', fresh: 'value' }));

    expect(result).toEqual({ written: 2, failures: [], error: null });
    expect(map.get('existing')).toBe('new');
    expect(storageStore.getSnapshot().adapters[0].entries.map((it) => [it.key, it.text])).toEqual([
      ['existing', 'new'],
      ['fresh', 'value'],
    ]);
  });

  it('attributes a failure to the key that caused it and keeps going', async () => {
    const { map, adapter } = setup({}, { failOn: 'bad' });
    await readAdapter(adapter);

    const result = await applyStorageImport('memory', planFor({ bad: 'x', good: 'y' }));

    expect(result.written).toBe(1);
    expect(result.failures).toEqual([{ key: 'bad', message: 'locked' }]);
    expect(map.get('good')).toBe('y');
  });

  it('refuses a store registered read-only, before writing anything', async () => {
    const map = new Map<string, string>();
    const [adapter] = resolveStorageAdapters(
      [
        defineStorageAdapter({
          name: 'Memory',
          getAllKeys: () => [...map.keys()],
          getItem: (key: string) => map.get(key) ?? null,
          setItem: (key: string, text: string) => {
            map.set(key, text);
          },
        }),
      ],
      { readOnly: true }
    );
    storageStore.setAdapters([adapter]);
    await readAdapter(adapter);

    const result = await applyStorageImport('memory', planFor({ a: '1' }));

    expect(result.error).toMatch(/read-only/);
    expect(map.size).toBe(0);
  });
});
