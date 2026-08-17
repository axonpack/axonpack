import { buildStorageEntry, messageOf } from './read-storage.service';
import { storageStore, type StorageEntry } from '../../stores/storage/storage.store';

/**
 * Writes go back through the type the value was read as, which is why these take the whole entry
 * rather than a key: a number edited in a text box is still a number to the store underneath.
 *
 * Both return the failure message, or `null` on success — the editor shows it inline, and throwing
 * out of a save handler would only mean catching it again one frame later.
 */
export async function setStorageValue(entry: StorageEntry, text: string): Promise<string | null> {
  const adapter = storageStore.findAdapter(entry.adapterId);
  if (!adapter) return 'That store is no longer registered.';

  const { setItem } = adapter;
  if (!setItem || !adapter.canEdit) return `${adapter.name} is read-only.`;

  try {
    await setItem(entry.key, text, entry.valueType);
  } catch (error) {
    return messageOf(error);
  }

  // Read the key back rather than trusting the text we sent: a store is free to normalise it.
  try {
    const result = await adapter.getItem(entry.key);
    storageStore.patchEntry(adapter.id, buildStorageEntry(adapter.id, entry.key, result));
  } catch (error) {
    storageStore.patchEntry(adapter.id, {
      ...buildStorageEntry(adapter.id, entry.key, { text, valueType: entry.valueType }),
      error: messageOf(error),
    });
  }

  return null;
}

export async function removeStorageKey(entry: StorageEntry): Promise<string | null> {
  const adapter = storageStore.findAdapter(entry.adapterId);
  if (!adapter) return 'That store is no longer registered.';

  const { removeItem } = adapter;
  if (!removeItem || !adapter.canDelete) return `${adapter.name} is read-only.`;

  try {
    await removeItem(entry.key);
  } catch (error) {
    return messageOf(error);
  }

  storageStore.removeEntry(adapter.id, entry.key);
  return null;
}
