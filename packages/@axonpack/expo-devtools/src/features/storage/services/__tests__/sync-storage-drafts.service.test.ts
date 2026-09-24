import { defineStorageAdapter, resolveStorageAdapters } from '../define-adapter.service';
import { readAllAdapters } from '../read-storage.service';
import { syncStorageDrafts } from '../sync-storage-drafts.service';
import { storageDraftsStore } from '../../stores/storage-drafts.store';
import { storageStore } from '../../stores/storage.store';

function register(values: Record<string, string>) {
  const map = new Map(Object.entries(values));
  const [adapter] = resolveStorageAdapters([
    defineStorageAdapter({
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
    }),
  ]);
  storageStore.setEnabled(true);
  storageStore.setAdapters([adapter]);
  return { id: adapter.id, map };
}

afterEach(() => {
  storageStore.reset();
  storageDraftsStore.setState(storageDraftsStore.getInitialState(), true);
});

describe('syncStorageDrafts', () => {
  it('writes edits and new keys, and clears what it wrote', async () => {
    const { id, map } = register({ a: '1' });
    await readAllAdapters();
    storageDraftsStore.setEdit(id, 'a', '2');
    storageDraftsStore.addRow(id, { key: 'b', valueType: 'string', text: 'new' });

    await syncStorageDrafts(id);

    expect(map.get('a')).toBe('2');
    expect(map.get('b')).toBe('new');
    expect(storageDraftsStore.getState().byAdapter[id]).toEqual({
      edits: {},
      added: [],
      errors: {},
    });
  });

  it('keeps what failed, with its reason', async () => {
    const { id, map } = register({ a: '1' });
    await readAllAdapters();
    storageDraftsStore.addRow(id, { key: 'a', valueType: 'string', text: 'clash' });
    storageDraftsStore.setEdit(id, 'gone', 'x');

    await syncStorageDrafts(id);

    const drafts = storageDraftsStore.getState().byAdapter[id];
    expect(map.get('a')).toBe('1');
    expect(map.has('gone')).toBe(false);
    expect(drafts.added).toHaveLength(1);
    expect(drafts.errors[`add:${drafts.added[0].id}`]).toBe('"a" already exists in Memory.');
    expect(drafts.errors['edit:gone']).toBe('"gone" is no longer in the store.');
    expect(storageDraftsStore.getState().syncing).toBe(false);
  });
});
