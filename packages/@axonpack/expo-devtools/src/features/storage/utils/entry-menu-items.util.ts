import * as Clipboard from 'expo-clipboard';

import type { ContextMenuItem } from '../../../core/components/ui/context-menu.ui';
import { formatJson } from '../../../core/utils/format-json.util';
import type { StorageEntry } from '../stores/storage.store';

/**
 * What each copy item copies, apart from how it is copied: the app writes these to its own
 * clipboard, and the DevTools tab has the browser write them to the computer's.
 */
export function storageCopyTexts(entry: StorageEntry): { label: string; text: string }[] {
  const value = entry.text ?? '';

  return [
    { label: 'Copy key', text: entry.key },
    { label: 'Copy value', text: value },
    { label: 'Copy as JSON', text: JSON.stringify({ [entry.key]: entry.text }, null, 2) },
    ...(entry.kind === 'json-object' || entry.kind === 'json-array'
      ? [{ label: 'Copy value (formatted)', text: formatJson(value) }]
      : []),
  ];
}

export function buildStorageCopyMenuItems(entry: StorageEntry): ContextMenuItem[] {
  return storageCopyTexts(entry).map(({ label, text }) => ({
    label,
    onPress: () => Clipboard.setStringAsync(text),
  }));
}
