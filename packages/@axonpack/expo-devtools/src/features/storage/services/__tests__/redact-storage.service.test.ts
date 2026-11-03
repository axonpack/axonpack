import { buildStorageExport, readStorageImport } from '../../utils/build-storage-export.util';
import { storageDraftsStore } from '../../stores/storage-drafts.store';
import { storageStore, type StorageEntry } from '../../stores/storage.store';
import { defineStorageAdapter, resolveStorageAdapters } from '../define-adapter.service';
import { applyStorageImport } from '../import-storage.service';
import {
  readAdapter,
  readStorageKey,
  readUnreadEntries,
  watchStorageAdapters,
} from '../read-storage.service';
import { configureStorageRedaction } from '../redact-storage.service';
import { syncStorageDrafts } from '../sync-storage-drafts.service';
import { removeStorageKey, setStorageValue } from '../write-storage.service';

function register(values: Record<string, string>) {
  const map = new Map(Object.entries(values));
  const listeners = new Set<(key: string) => void>();
  const [adapter] = resolveStorageAdapters([
    defineStorageAdapter({
      name: 'Memory',
      getAllKeys: () => [...map.keys()],
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, text: string) => {
        map.set(key, text);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    }),
  ]);
  storageStore.setAdapters([adapter]);
  function write(key: string, value: string) {
    map.set(key, value);
    listeners.forEach((listener) => listener(key));
  }
  return { adapter, map, write };
}

function entries(): StorageEntry[] {
  return storageStore.getSnapshot().adapters[0].entries;
}

function entry(key: string): StorageEntry {
  const found = entries().find((it) => it.key === key);
  if (!found) throw new Error(`no entry for ${key}`);
  return found;
}

async function readWhole(adapter: ReturnType<typeof register>['adapter']) {
  await readAdapter(adapter);
  await readUnreadEntries(entries());
}

beforeEach(() => {
  storageStore.reset();
  storageStore.setEnabled(true);
  configureStorageRedaction({});
});

afterEach(() => {
  storageDraftsStore.setState(storageDraftsStore.getInitialState(), true);
});

describe('storage redaction', () => {
  it('redacts nothing by default', async () => {
    const { adapter } = register({ authToken: 'secret' });
    await readWhole(adapter);

    expect(entry('authToken').text).toBe('secret');
    expect(entry('authToken').redacted).toBeUndefined();
  });

  it('redacts listed keys, a string without regard to case and a regex as written', async () => {
    configureStorageRedaction({ keys: ['AUTHTOKEN', /^session\./g] });
    const { adapter } = register({
      authToken: '{"jwt":"secret"}',
      'session.a': 'x',
      'session.b': 'y',
      'Session.c': 'z',
      theme: 'dark',
    });
    await readWhole(adapter);

    expect(entry('authToken')).toMatchObject({
      text: '[redacted]',
      kind: 'string',
      size: 10,
      redacted: true,
    });
    // A `/g` regex keeps `lastIndex` between tests, so the second key would slip through.
    expect(entry('session.a').text).toBe('[redacted]');
    expect(entry('session.b').text).toBe('[redacted]');
    expect(entry('Session.c').text).toBe('z');
    expect(entry('theme').redacted).toBeUndefined();
  });

  it('runs the hook after the keys, and hides a key on null or a throw', async () => {
    const seen: (string | null)[] = [];
    configureStorageRedaction({
      keys: ['authToken'],
      redact: (it) => {
        seen.push(it.text);
        if (it.key === 'hidden') return null;
        if (it.key === 'broken') throw new Error('bug');
        if (it.key === 'user' && it.text) {
          return { ...it, key: 'renamed', text: it.text.replace(/"token":"[^"]*"/, '"token":"x"') };
        }
        return it;
      },
    });
    const { adapter } = register({
      authToken: 'secret',
      broken: 'b',
      hidden: 'h',
      user: '{"name":"a","token":"t"}',
    });
    await readWhole(adapter);

    expect(entries().map((it) => it.key)).toEqual(['authToken', 'user']);
    expect(seen).toContain('[redacted]');
    expect(seen).not.toContain('secret');
    expect(entry('user')).toMatchObject({
      text: '{"name":"a","token":"x"}',
      kind: 'json-object',
      redacted: true,
    });
    expect(stateTotal()).toBe(2);
  });

  it('redacts a live change and a re-read the same way', async () => {
    configureStorageRedaction({ keys: ['authToken'] });
    const { adapter, write } = register({ authToken: 'old' });
    await readWhole(adapter);
    const stop = watchStorageAdapters();

    write('authToken', 'new');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await readStorageKey(adapter, 'authToken');
    stop();

    expect(entry('authToken').text).toBe('[redacted]');
  });

  it('will not edit or delete a redacted value, from the panel or a draft', async () => {
    configureStorageRedaction({ keys: ['authToken'] });
    const { adapter, map } = register({ authToken: 'secret' });
    await readWhole(adapter);

    expect(await setStorageValue(entry('authToken'), '[redacted]')).toMatch(/redacted/);
    expect(await removeStorageKey(entry('authToken'))).toMatch(/redacted/);

    storageDraftsStore.setEdit(adapter.id, 'authToken', '[redacted]');
    await syncStorageDrafts(adapter.id);

    expect(map.get('authToken')).toBe('secret');
    expect(storageDraftsStore.getState().byAdapter[adapter.id].errors['edit:authToken']).toMatch(
      /redacted/
    );
  });

  it('exports a redacted value marked as such, and an import skips it', async () => {
    configureStorageRedaction({ keys: ['authToken'] });
    const { adapter, map } = register({ authToken: 'secret', theme: 'dark' });
    await readWhole(adapter);
    const file = buildStorageExport(adapter, entries(), '2026-11-03T00:00:00.000Z');

    expect(file.entries).toEqual([
      { key: 'authToken', value: '[redacted]', type: 'string', bytes: 10, redacted: true },
      { key: 'theme', value: 'dark', type: 'string', bytes: 4 },
    ]);

    // Into a store that no longer holds the key, so only the file's mark can stop the write.
    map.delete('authToken');
    map.set('theme', 'light');
    await readWhole(adapter);
    const reading = readStorageImport(JSON.stringify(file), adapter, entries());
    if (reading.state !== 'read') throw new Error(reading.state);

    expect(reading.plan.skipped).toEqual([{ key: 'authToken', reason: 'redacted' }]);
    await applyStorageImport(adapter.id, reading.plan);
    expect(map.has('authToken')).toBe(false);
    expect(map.get('theme')).toBe('dark');
  });

  it('skips an import over a key that is redacted here, whatever the file holds', async () => {
    configureStorageRedaction({ keys: ['authToken'] });
    const { adapter } = register({ authToken: 'secret' });
    await readWhole(adapter);
    const file = {
      ...buildStorageExport(adapter, [], ''),
      entries: [{ key: 'authToken', value: 'other', type: 'string', bytes: 5 }],
    };

    const reading = readStorageImport(JSON.stringify(file), adapter, entries());
    if (reading.state !== 'read') throw new Error(reading.state);

    expect(reading.plan.overwrite).toEqual([]);
    expect(reading.plan.skipped).toEqual([{ key: 'authToken', reason: 'redacted' }]);
  });
});

function stateTotal() {
  return storageStore.getSnapshot().adapters[0].totalKeys;
}
