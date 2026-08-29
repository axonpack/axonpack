import type {
  StorageAdapter,
  StorageAdapterKind,
  StorageValueType,
} from '../services/define-adapter.service';
import { ALL_VALUE_TYPES } from '../services/define-adapter.service';
import type { StorageEntry } from '../stores/storage.store';

/**
 * Bumped when the shape below changes in a way something reading an old file would notice. The
 * network export has carried one since it existed; this one did not, which meant the first change to
 * it would have broken every file already written with no way to tell the two apart.
 */
export const STORAGE_EXPORT_SCHEMA_VERSION = 1;

export type ExportedStorageEntry = {
  key: string;
  /** `null` is a key that holds no value — a declared SecureStore key that was never written. */
  value: string | null;
  type: StorageValueType;
  bytes: number;
};

export type StorageExport = {
  schemaVersion: typeof STORAGE_EXPORT_SCHEMA_VERSION;
  tool: '@axonpack/expo-devtools';
  exportedAt: string;
  /** Enough of the store to tell whether a file belongs here before anything is written back. */
  store: {
    id: string;
    name: string;
    kind: StorageAdapterKind;
    supportedTypes: StorageValueType[];
  };
  summary: { keys: number; bytes: number };
  entries: ExportedStorageEntry[];
};

export function buildStorageExport(
  adapter: StorageAdapter,
  entries: readonly StorageEntry[],
  exportedAt: string
): StorageExport {
  return {
    schemaVersion: STORAGE_EXPORT_SCHEMA_VERSION,
    tool: '@axonpack/expo-devtools',
    exportedAt,
    store: {
      id: adapter.id,
      name: adapter.name,
      kind: adapter.kind,
      supportedTypes: [...adapter.supportedTypes],
    },
    summary: {
      keys: entries.length,
      bytes: entries.reduce((total, entry) => total + entry.size, 0),
    },
    entries: entries.map((entry) => ({
      key: entry.key,
      value: entry.text,
      type: entry.valueType,
      bytes: entry.size,
    })),
  };
}

export type StorageExportParse =
  { ok: true; file: StorageExport } | { ok: false; path: string; message: string };

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads a file back with the path of whatever is wrong, because "invalid snapshot" tells whoever
 * pasted it nothing. A file from another version is refused outright rather than read on the hope
 * that the fields it needs happen to be there.
 */
export function parseStorageExport(raw: unknown): StorageExportParse {
  if (!isRecord(raw))
    return { ok: false, path: 'file', message: `Expected an object, got ${describe(raw)}.` };

  if (raw.schemaVersion !== STORAGE_EXPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      path: 'schemaVersion',
      message:
        raw.schemaVersion === undefined
          ? 'This file has no schemaVersion — it was written before storage exports carried one.'
          : `This build reads version ${STORAGE_EXPORT_SCHEMA_VERSION}, and the file says ${JSON.stringify(raw.schemaVersion)}.`,
    };
  }

  const store = raw.store;
  if (!isRecord(store))
    return { ok: false, path: 'store', message: `Expected an object, got ${describe(store)}.` };
  if (typeof store.name !== 'string') {
    return {
      ok: false,
      path: 'store.name',
      message: `Expected a string, got ${describe(store.name)}.`,
    };
  }

  const rawEntries = raw.entries;
  if (!Array.isArray(rawEntries)) {
    return {
      ok: false,
      path: 'entries',
      message: `Expected an array, got ${describe(rawEntries)}.`,
    };
  }

  const entries: ExportedStorageEntry[] = [];
  for (const [index, candidate] of rawEntries.entries()) {
    const path = `entries[${index}]`;
    if (!isRecord(candidate))
      return { ok: false, path, message: `Expected an object, got ${describe(candidate)}.` };
    if (typeof candidate.key !== 'string') {
      return {
        ok: false,
        path: `${path}.key`,
        message: `Expected a string, got ${describe(candidate.key)}.`,
      };
    }
    if (candidate.value !== null && typeof candidate.value !== 'string') {
      return {
        ok: false,
        path: `${path}.value`,
        message: `Expected a string or null, got ${describe(candidate.value)}.`,
      };
    }
    if (!ALL_VALUE_TYPES.includes(candidate.type as StorageValueType)) {
      return {
        ok: false,
        path: `${path}.type`,
        message: `Expected one of ${ALL_VALUE_TYPES.join(', ')}, got ${JSON.stringify(candidate.type)}.`,
      };
    }
    entries.push({
      key: candidate.key,
      value: candidate.value,
      type: candidate.type as StorageValueType,
      bytes: typeof candidate.bytes === 'number' ? candidate.bytes : 0,
    });
  }

  return {
    ok: true,
    file: {
      schemaVersion: STORAGE_EXPORT_SCHEMA_VERSION,
      tool: '@axonpack/expo-devtools',
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      store: {
        id: typeof store.id === 'string' ? store.id : '',
        name: store.name,
        kind: store.kind === 'sync' ? 'sync' : 'async',
        supportedTypes: Array.isArray(store.supportedTypes)
          ? store.supportedTypes.filter((type): type is StorageValueType =>
              ALL_VALUE_TYPES.includes(type as StorageValueType)
            )
          : [...ALL_VALUE_TYPES],
      },
      summary: { keys: entries.length, bytes: 0 },
      entries,
    },
  };
}

export type StorageImportSkip = {
  key: string;
  /** `hidden`: the blacklist. `unsupported`: a type this store doesn't hold. `empty`: no value. */
  reason: 'hidden' | 'unsupported' | 'empty';
  type?: StorageValueType;
};

export type StorageImportPlan = {
  /** The file names the store it came from; writing another store's keys is allowed, but said. */
  fromStore: string;
  differentStore: boolean;
  create: ExportedStorageEntry[];
  overwrite: ExportedStorageEntry[];
  /** Already holds exactly this value — not written, so an import of a file you just made is a no-op. */
  unchanged: ExportedStorageEntry[];
  skipped: StorageImportSkip[];
};

/**
 * What the file would do, worked out before anything is written. The comparison is against the keys
 * on screen, which are as old as the last read — a create that turns out to exist is still refused
 * by the write itself, so the preview being stale can only make it look emptier than it is.
 */
export function planStorageImport(
  file: StorageExport,
  adapter: StorageAdapter,
  entries: readonly StorageEntry[]
): StorageImportPlan {
  const current = new Map(entries.map((entry) => [entry.key, entry]));
  const plan: StorageImportPlan = {
    fromStore: file.store.name,
    differentStore: file.store.id !== adapter.id,
    create: [],
    overwrite: [],
    unchanged: [],
    skipped: [],
  };

  for (const entry of file.entries) {
    if (adapter.isHidden(entry.key)) {
      plan.skipped.push({ key: entry.key, reason: 'hidden' });
      continue;
    }
    if (!adapter.supportedTypes.includes(entry.type)) {
      plan.skipped.push({ key: entry.key, reason: 'unsupported', type: entry.type });
      continue;
    }
    if (entry.value === null) {
      plan.skipped.push({ key: entry.key, reason: 'empty' });
      continue;
    }

    const existing = current.get(entry.key);
    if (existing === undefined) plan.create.push(entry);
    else if (existing.text === entry.value && existing.valueType === entry.type) {
      plan.unchanged.push(entry);
    } else plan.overwrite.push(entry);
  }

  return plan;
}
