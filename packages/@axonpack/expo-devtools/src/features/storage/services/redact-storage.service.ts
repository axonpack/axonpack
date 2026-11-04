import { keyMatcher } from '../../../core/utils/key-matcher.util';
import { REDACTED } from '../../network/services/redact-network.service';
import type { StorageEntry } from '../stores/storage.store';
import { classifyStoredValue } from '../utils/classify-value.util';
import { utf8ByteLength } from '../utils/formatters.util';

let isRedactedKey = keyMatcher();
let redactHook: ((entry: StorageEntry) => StorageEntry | null) | undefined;

export function configureStorageRedaction(options: {
  keys?: readonly (string | RegExp)[];
  redact?: (entry: StorageEntry) => StorageEntry | null;
}) {
  isRedactedKey = keyMatcher(options.keys);
  redactHook = options.redact;
}

function withText(entry: StorageEntry, text: string | null): StorageEntry {
  return {
    ...entry,
    text,
    kind: classifyStoredValue(text, entry.valueType),
    size: utf8ByteLength(text),
  };
}

/**
 * Runs on every value read, before it is stored, so the list, the detail sheet, copy, export and the
 * DevTools tab only ever see what comes out of here. `null` means hide the key. Only `text` is taken
 * from the hook: the store finds an entry by its key, so a hook that changed it would orphan the row.
 */
export function redactStorageEntry(entry: StorageEntry): StorageEntry | null {
  let redacted: StorageEntry | null =
    entry.text !== null && isRedactedKey(entry.key) ? withText(entry, REDACTED) : entry;
  if (redactHook) {
    try {
      redacted = redactHook(redacted);
    } catch {
      // Fail closed. Showing the value after the app's own redaction broke could show the very
      // value it was written to hide.
      return null;
    }
  }
  if (redacted === null) return null;
  if (redacted.text === entry.text) return entry;
  return { ...withText(entry, redacted.text), redacted: true };
}
