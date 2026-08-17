import type { StorageAdapter, StorageReadResult } from './define-adapter.service';
import { storageStore, type StorageEntry } from '../../stores/storage/storage.store';
import { classifyStoredValue } from '../../utils/storage/classify-value.util';
import { utf8ByteLength } from '../../utils/storage/formatters.util';

const DEFAULT_MAX_KEYS = 1000;

/** Read in slices so a store with thousands of keys doesn't open a request per key all at once. */
const BATCH_SIZE = 100;

const ABSENT: StorageReadResult = { text: null, valueType: 'string' };

let maxKeys = DEFAULT_MAX_KEYS;

export function configureStorageReads(options: { maxKeys?: number }) {
  if (options.maxKeys !== undefined) maxKeys = Math.max(1, options.maxKeys);
}

export function getStorageMaxKeys(): number {
  return maxKeys;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function buildStorageEntry(
  adapterId: string,
  key: string,
  result: StorageReadResult,
  error?: string
): StorageEntry {
  return {
    adapterId,
    key,
    text: result.text,
    valueType: result.valueType,
    kind: classifyStoredValue(result.text, result.valueType),
    size: utf8ByteLength(result.text),
    error,
  };
}

/**
 * One store, read whole. A failure listing the keys is the adapter's failure and shows as one; a
 * failure on a single key is that key's, and the other keys still arrive — SecureStore throws per
 * key when a value can't be decrypted, and losing the whole store to that would be the wrong trade.
 */
export async function readAdapter(adapter: StorageAdapter): Promise<void> {
  if (!storageStore.isEnabled()) return;

  storageStore.beginRead(adapter.id);

  try {
    const allKeys = await adapter.getAllKeys();
    const keys = [...allKeys].sort((a, b) => a.localeCompare(b)).slice(0, maxKeys);

    const entries: StorageEntry[] = [];
    for (let at = 0; at < keys.length; at += BATCH_SIZE) {
      entries.push(...(await readBatch(adapter, keys.slice(at, at + BATCH_SIZE))));
    }

    storageStore.setEntries(adapter.id, entries, {
      truncated: allKeys.length > keys.length,
      totalKeys: allKeys.length,
      readAt: Date.now(),
    });
  } catch (error) {
    storageStore.failRead(adapter.id, messageOf(error));
  }
}

async function readBatch(adapter: StorageAdapter, keys: string[]): Promise<StorageEntry[]> {
  const { getMany } = adapter;

  if (getMany) {
    try {
      const results = await getMany(keys);
      return keys.map((key) => buildStorageEntry(adapter.id, key, results.get(key) ?? ABSENT));
    } catch {
      // A batch read that throws tells us nothing about which key broke, so fall back to one at a
      // time and let the per-key errors below name it.
    }
  }

  return Promise.all(
    keys.map(async (key) => {
      try {
        return buildStorageEntry(adapter.id, key, await adapter.getItem(key));
      } catch (error) {
        return buildStorageEntry(adapter.id, key, ABSENT, messageOf(error));
      }
    })
  );
}

export async function readAllAdapters(): Promise<void> {
  await Promise.all(storageStore.getAdapters().map((adapter) => readAdapter(adapter)));
}

export async function readAdapterById(adapterId: string): Promise<void> {
  const adapter = storageStore.findAdapter(adapterId);
  if (adapter) await readAdapter(adapter);
}
