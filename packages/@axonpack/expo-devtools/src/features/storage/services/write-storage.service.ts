import type { StorageAdapter, StorageValueType } from './define-adapter.service';
import { buildStorageEntry, messageOf } from './read-storage.service';
import { storageStore, type StorageEntry } from '../stores/storage.store';

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

  await readBack(adapter, entry.key, text, entry.valueType);
  return null;
}

/**
 * Distinct from an edit rather than an alias for it: the type is chosen instead of inherited from a
 * value that is already there, and a key that already exists is refused rather than overwritten —
 * "add" that silently replaces something is the one outcome nobody asks for.
 */
export async function createStorageKey(
  adapterId: string,
  key: string,
  text: string,
  valueType: StorageValueType
): Promise<string | null> {
  const adapter = storageStore.findAdapter(adapterId);
  if (!adapter) return 'That store is no longer registered.';

  const { setItem } = adapter;
  if (!setItem || !adapter.canEdit) return `${adapter.name} is read-only.`;
  if (key.length === 0) return 'A key needs a name.';
  if (adapter.isHidden(key)) return `"${key}" is hidden by ${adapter.name}'s blacklist.`;
  if (!adapter.supportedTypes.includes(valueType)) {
    return `${adapter.name} does not hold ${valueType} values.`;
  }

  // Ask the store, not the list on screen: the list is as old as the last read, and a store this tab
  // cannot enumerate holds keys the list never had.
  try {
    const existing = await adapter.getItem(key);
    if (existing.text !== null) return `"${key}" already exists in ${adapter.name}.`;
  } catch (error) {
    return `Could not check whether "${key}" already exists — ${messageOf(error)}`;
  }

  try {
    await setItem(key, text, valueType);
  } catch (error) {
    return messageOf(error);
  }

  await readBack(adapter, key, text, valueType);
  return null;
}

/** Read the key back rather than trusting the text we sent: a store is free to normalise it. */
async function readBack(
  adapter: StorageAdapter,
  key: string,
  text: string,
  valueType: StorageValueType
): Promise<void> {
  try {
    storageStore.patchEntry(
      adapter.id,
      buildStorageEntry(adapter.id, key, await adapter.getItem(key))
    );
  } catch (error) {
    storageStore.patchEntry(adapter.id, {
      ...buildStorageEntry(adapter.id, key, { text, valueType }),
      error: messageOf(error),
    });
  }
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
