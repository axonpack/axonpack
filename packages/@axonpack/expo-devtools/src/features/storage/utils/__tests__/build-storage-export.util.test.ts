import {
  buildStorageExport,
  parseStorageExport,
  planStorageImport,
  STORAGE_EXPORT_SCHEMA_VERSION,
} from '../build-storage-export.util';
import {
  defineStorageAdapter,
  resolveStorageAdapters,
  type StorageAdapter,
  type StorageKeyBlacklist,
  type StorageValueType,
} from '../../services/define-adapter.service';
import type { StorageEntry } from '../../stores/storage.store';

function adapterFor(
  options: {
    supportedTypes?: StorageValueType[];
    blacklist?: StorageKeyBlacklist;
  } = {}
): StorageAdapter {
  const [adapter] = resolveStorageAdapters([
    defineStorageAdapter({
      name: 'Memory',
      kind: 'sync',
      supportedTypes: options.supportedTypes,
      blacklist: options.blacklist,
      getAllKeys: () => [],
      getItem: () => null,
      setItem: () => undefined,
    }),
  ]);
  return adapter;
}

function entry(
  key: string,
  text: string | null,
  valueType: StorageValueType = 'string'
): StorageEntry {
  return {
    adapterId: 'memory',
    key,
    text,
    valueType,
    kind: text === null ? 'absent' : 'string',
    size: text?.length ?? 0,
  };
}

describe('buildStorageExport', () => {
  it('stamps the schema version, the tool and the store it came from', () => {
    const file = buildStorageExport(adapterFor(), [entry('a', '1')], '2026-08-28T00:00:00.000Z');

    expect(file.schemaVersion).toBe(STORAGE_EXPORT_SCHEMA_VERSION);
    expect(file.tool).toBe('@axonpack/expo-devtools');
    expect(file.store).toEqual({
      id: 'memory',
      name: 'Memory',
      kind: 'sync',
      supportedTypes: ['string', 'number', 'boolean', 'buffer'],
    });
    expect(file.summary).toEqual({ keys: 1, bytes: 1 });
    expect(file.entries).toEqual([{ key: 'a', value: '1', type: 'string', bytes: 1 }]);
  });
});

describe('parseStorageExport', () => {
  const file = buildStorageExport(adapterFor(), [entry('a', '1')], '2026-08-28T00:00:00.000Z');

  it('reads back what it wrote', () => {
    const parsed = parseStorageExport(JSON.parse(JSON.stringify(file)));

    expect(parsed.ok && parsed.file.entries).toEqual(file.entries);
  });

  it('refuses a file from a version it does not read, and says which', () => {
    expect(parseStorageExport({ ...file, schemaVersion: 2 })).toMatchObject({
      ok: false,
      path: 'schemaVersion',
    });
    expect(parseStorageExport({ store: {}, entries: [] })).toMatchObject({
      ok: false,
      path: 'schemaVersion',
      message: expect.stringMatching(/no schemaVersion/),
    });
  });

  it('names the path of whatever is wrong', () => {
    expect(parseStorageExport({ ...file, entries: [{ key: 1 }] })).toMatchObject({
      ok: false,
      path: 'entries[0].key',
    });
    expect(
      parseStorageExport({ ...file, entries: [{ key: 'a', value: '1', type: 'date' }] })
    ).toMatchObject({ ok: false, path: 'entries[0].type' });
    expect(parseStorageExport('not a file')).toMatchObject({ ok: false, path: 'file' });
  });
});

describe('planStorageImport', () => {
  const file = buildStorageExport(
    adapterFor(),
    [entry('kept', 'same'), entry('changed', 'new'), entry('fresh', 'value')],
    '2026-08-28T00:00:00.000Z'
  );

  it('splits new from overwritten from already-matching', () => {
    const plan = planStorageImport(file, adapterFor(), [
      entry('kept', 'same'),
      entry('changed', 'old'),
    ]);

    expect(plan.create.map((it) => it.key)).toEqual(['fresh']);
    expect(plan.overwrite.map((it) => it.key)).toEqual(['changed']);
    expect(plan.unchanged.map((it) => it.key)).toEqual(['kept']);
    expect(plan.skipped).toEqual([]);
    expect(plan.differentStore).toBe(false);
  });

  it('skips a blacklisted key, an unsupported type and a key with no value', () => {
    const withHoles = buildStorageExport(
      adapterFor(),
      [entry('auth.token', 'secret'), entry('count', '7', 'number'), entry('never-set', null)],
      '2026-08-28T00:00:00.000Z'
    );

    const plan = planStorageImport(
      withHoles,
      adapterFor({ supportedTypes: ['string'], blacklist: /^auth\./ }),
      []
    );

    expect(plan.create).toEqual([]);
    expect(plan.skipped).toEqual([
      { key: 'auth.token', reason: 'hidden' },
      { key: 'count', reason: 'unsupported', type: 'number' },
      { key: 'never-set', reason: 'empty' },
    ]);
  });

  it('says when the file came from another store', () => {
    const [other] = resolveStorageAdapters([
      defineStorageAdapter({ name: 'Elsewhere', getAllKeys: () => [], getItem: () => null }),
    ]);

    expect(planStorageImport(file, other, []).differentStore).toBe(true);
    expect(planStorageImport(file, other, []).fromStore).toBe('Memory');
  });
});
