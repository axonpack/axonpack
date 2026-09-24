import {
  defineStorageAdapter,
  resolveStorageAdapters,
} from '../../services/define-adapter.service';
import type { StorageAdapterState, StorageEntry } from '../../stores/storage.store';
import { emptyListLabel, summarizeStorage } from '../summary.util';

function entry(key: string, size: number): StorageEntry {
  return { adapterId: 'memory', key, text: 'x', valueType: 'string', kind: 'string', size };
}

function stateWith(patch: Partial<StorageAdapterState>, keys?: string[]): StorageAdapterState {
  const [adapter] = resolveStorageAdapters([
    defineStorageAdapter({
      name: 'Memory',
      kind: 'sync',
      keys,
      getAllKeys: keys ? undefined : () => [],
      getItem: () => null,
    }),
  ]);
  return { adapter, entries: [], status: 'ready', truncated: false, totalKeys: 0, ...patch };
}

describe('summarizeStorage', () => {
  it('totals the bytes and finds the largest key', () => {
    const summary = summarizeStorage(stateWith({ entries: [entry('a', 3), entry('b', 9)] }));
    expect(summary.totalBytes).toBe(12);
    expect(summary.largest?.key).toBe('b');
  });

  it('says when the read was capped, and when the store is read-only', () => {
    const readOnly = stateWith({}).adapter;
    const { notes } = summarizeStorage(
      stateWith({
        adapter: { ...readOnly, readOnly: true },
        entries: [entry('a', 1)],
        truncated: true,
        totalKeys: 5,
      })
    );
    expect(notes).toContain('Read 1 of 5 keys — the rest are past the cap.');
    expect(notes.some((note) => note.startsWith('Read-only'))).toBe(true);
  });

  it('says when the store cannot list its own keys', () => {
    const { notes } = summarizeStorage(stateWith({}, ['session']));
    expect(notes[0]).toBe("Memory can't list its own keys — showing the 0 you declared.");
  });
});

describe('emptyListLabel', () => {
  it('tells reading, an empty store and a filter apart', () => {
    expect(emptyListLabel(undefined)).toBe('Reading…');
    expect(emptyListLabel(stateWith({ status: 'reading' }))).toBe('Reading…');
    expect(emptyListLabel(stateWith({}))).toBe('This store holds no keys');
    expect(emptyListLabel(stateWith({ entries: [entry('a', 1)] }))).toBe(
      'No keys match your filter'
    );
  });
});
