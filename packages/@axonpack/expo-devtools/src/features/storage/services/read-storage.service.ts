import type { StorageAdapter, StorageReadResult } from './define-adapter.service';
import { storageStore, type StorageEntry } from '../stores/storage.store';
import { classifyStoredValue } from '../utils/classify-value.util';
import { sortKeys } from '../utils/filter-entries.util';
import { utf8ByteLength } from '../utils/formatters.util';

/** One `getMany` call's worth, so a long export doesn't open a request per key all at once. */
const BATCH_SIZE = 100;

/**
 * How long a row has to stay on screen before its value is read. A fast scroll moves past a row in
 * less than this, so it reads nothing it only flew past.
 */
export const SHOWN_FOR_MS = 150;

const ABSENT: StorageReadResult = { text: null, valueType: 'string' };

/** In-flight reads by `adapterId` and key, so a row reported twice is read once. */
const reading = new Map<string, Promise<void>>();

/** The rows the in-app list has on screen right now. */
let onScreen: readonly StorageEntry[] = [];

function readingId(entry: { adapterId: string; key: string }): string {
  return `${entry.adapterId}\n${entry.key}`;
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

function unreadEntry(adapterId: string, key: string): StorageEntry {
  return { adapterId, key, text: null, valueType: 'string', kind: 'unread', size: 0 };
}

/**
 * One store's keys, and no values: listing is one call, and a value costs a read, a type probe and
 * a JSON parse that nobody asked for until its row is on screen. The rows the list already shows
 * are read again straight away, since a refresh hands back every key unread and the same rows in
 * view report no change.
 *
 * A failure listing the keys is the adapter's failure and shows as one.
 */
export async function readAdapter(adapter: StorageAdapter): Promise<void> {
  if (!storageStore.isEnabled()) return;

  storageStore.beginRead(adapter.id);

  try {
    const allKeys = await adapter.getAllKeys();
    const entries = sortKeys(allKeys).map((key) => unreadEntry(adapter.id, key));

    storageStore.setEntries(adapter.id, entries, {
      totalKeys: allKeys.length,
      readAt: Date.now(),
    });
  } catch (error) {
    storageStore.failRead(adapter.id, messageOf(error));
    return;
  }

  await readUnreadEntries(onScreen.filter((entry) => entry.adapterId === adapter.id));
}

/**
 * A failure on a single key is that key's, and the other keys still arrive: SecureStore throws per
 * key when a value can't be decrypted, and losing the whole batch to that would be the wrong trade.
 */
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

/**
 * The in-app list reports what it has on screen here. Each report is read after `SHOWN_FOR_MS`, and
 * only the rows still on screen by then, so one read covers a whole screen and a fast scroll reads
 * none of what it passed.
 */
export function showStorageRows(entries: readonly StorageEntry[]) {
  onScreen = entries;
  setTimeout(() => {
    const stillShown = new Set(onScreen.map(readingId));
    readUnreadEntries(entries.filter((entry) => stillShown.has(readingId(entry))));
  }, SHOWN_FOR_MS);
}

function currentEntries(adapterId: string): Map<string, StorageEntry> {
  const state = storageStore.getSnapshot().adapters.find((it) => it.adapter.id === adapterId);
  return new Map((state?.entries ?? []).map((entry) => [entry.key, entry]));
}

/**
 * Reads the values of the given keys that are still unread, in batches, and resolves to their entries
 * as the store now holds them. A key read since, or deleted since, is looked up rather than trusted.
 * For rows on screen, a key being opened, an export, or the keys an import would overwrite.
 */
export async function readUnreadEntries(
  wanted: readonly Pick<StorageEntry, 'adapterId' | 'key'>[]
): Promise<StorageEntry[]> {
  const adapter = wanted.length > 0 ? storageStore.findAdapter(wanted[0].adapterId) : undefined;
  if (!adapter || !storageStore.isEnabled()) return [];

  const current = currentEntries(adapter.id);
  const keys = wanted
    .map((entry) => entry.key)
    .filter(
      (key) =>
        current.get(key)?.kind === 'unread' &&
        !reading.has(readingId({ adapterId: adapter.id, key }))
    );

  // One batch after another, each registered before it starts, so a second call already sees them.
  let previous = Promise.resolve();
  for (let at = 0; at < keys.length; at += BATCH_SIZE) {
    const batch = keys.slice(at, at + BATCH_SIZE);
    const ids = batch.map((key) => readingId({ adapterId: adapter.id, key }));
    const done = previous
      .then(() => readBatch(adapter, batch))
      .then((read) => {
        // Listed earlier, gone by the time its row was shown: drop it, as a live delete would.
        // A store that can't list its keys shows a fixed list, so there it stays, as unset.
        const gone = adapter.canEnumerate
          ? read.filter((entry) => entry.text === null && entry.error === undefined)
          : [];
        for (const entry of gone) storageStore.removeEntry(adapter.id, entry.key);
        storageStore.fillEntries(
          adapter.id,
          read.filter((entry) => !gone.includes(entry))
        );
      })
      .finally(() => {
        for (const id of ids) reading.delete(id);
      });
    for (const id of ids) reading.set(id, done);
    previous = done;
  }

  // Waits for this call's batches and for any other call already reading on the same keys.
  await Promise.all(wanted.map((entry) => reading.get(readingId(entry))));

  const now = currentEntries(adapter.id);
  return wanted.flatMap((entry) => now.get(entry.key) ?? []);
}

export async function readAllAdapters(): Promise<void> {
  await Promise.all(storageStore.getAdapters().map((adapter) => readAdapter(adapter)));
}

/**
 * Re-reads one key the store said it changed. A store mid-read or not read yet is left alone, since
 * that read brings the key with it.
 *
 * Only a value already read is read again. A key the list doesn't hold joins it unread, and an
 * unread key is read only if its row is on screen, as any other row would be. Whether an unread key
 * was deleted rather than changed is only learned by reading it, so it stays listed until its row
 * is shown, and drops off then.
 */
export async function readStorageKey(adapter: StorageAdapter, key: string): Promise<void> {
  if (!storageStore.isEnabled()) return;

  const state = storageStore.getSnapshot().adapters.find((it) => it.adapter.id === adapter.id);
  if (state?.status !== 'ready') return;

  const listed = state.entries.find((entry) => entry.key === key);
  if (listed === undefined) {
    storageStore.patchEntry(adapter.id, unreadEntry(adapter.id, key));
    return;
  }
  if (listed.kind === 'unread') {
    if (onScreen.some((entry) => entry.adapterId === adapter.id && entry.key === key)) {
      await readUnreadEntries([listed]);
    }
    return;
  }

  try {
    const result = await adapter.getItem(key);
    // A store that can't list its keys shows a fixed list, so a removed key stays on it as unset.
    if (result.text === null && adapter.canEnumerate) storageStore.removeEntry(adapter.id, key);
    else storageStore.patchEntry(adapter.id, buildStorageEntry(adapter.id, key, result));
  } catch (error) {
    storageStore.patchEntry(
      adapter.id,
      buildStorageEntry(adapter.id, key, ABSENT, messageOf(error))
    );
  }
}

/** Listens to every store that can report its changes. Returns the function that stops. */
export function watchStorageAdapters(): () => void {
  const stops = storageStore.getAdapters().map((adapter) =>
    adapter.subscribe?.((key) => {
      readStorageKey(adapter, key);
    })
  );
  return () => stops.forEach((stop) => stop?.());
}

export async function readAdapterById(adapterId: string): Promise<void> {
  const adapter = storageStore.findAdapter(adapterId);
  if (adapter) await readAdapter(adapter);
}
