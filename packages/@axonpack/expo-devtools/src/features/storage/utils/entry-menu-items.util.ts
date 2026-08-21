import * as Clipboard from 'expo-clipboard';

import type { ContextMenuItem } from '../../../core/components/ui/context-menu.ui';
import type { StorageEntry } from '../stores/storage.store';

export function buildStorageCopyMenuItems(entry: StorageEntry): ContextMenuItem[] {
  const value = entry.text ?? '';

  return [
    { label: 'Copy key', onPress: () => Clipboard.setStringAsync(entry.key) },
    { label: 'Copy value', onPress: () => Clipboard.setStringAsync(value) },
    {
      label: 'Copy as JSON',
      onPress: () => Clipboard.setStringAsync(JSON.stringify({ [entry.key]: entry.text }, null, 2)),
    },
    ...(entry.kind === 'json-object' || entry.kind === 'json-array'
      ? [
          {
            label: 'Copy value (formatted)',
            onPress: () => Clipboard.setStringAsync(formatJson(value)),
          },
        ]
      : []),
  ];
}

function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
