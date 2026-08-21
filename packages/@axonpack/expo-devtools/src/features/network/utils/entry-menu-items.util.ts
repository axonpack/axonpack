import * as Clipboard from 'expo-clipboard';

import { buildCurlCommand } from './curl.util';
import { buildFetchCommand, buildNodeFetchCommand } from './fetch-snippet.util';
import { shareResponseBody } from './share-response-body.util';
import type { ContextMenuItem } from '../../../core/components/ui/context-menu.ui';
import type { NetworkLogEntry } from '../stores/network-log.store';
import { networkOverridesStore } from '../stores/network-overrides.store';

export function buildEntryCopyMenuItems(
  entry: NetworkLogEntry,
  /** Opens the override sheet for this URL. Absent where there is no sheet to open. */
  onOverride?: (url: string) => void
): ContextMenuItem[] {
  const blocked = networkOverridesStore.find(entry.url)?.action === 'block';

  return [
    { label: 'Copy URL', onPress: () => Clipboard.setStringAsync(entry.url) },
    { label: 'Copy as cURL', onPress: () => Clipboard.setStringAsync(buildCurlCommand(entry)) },
    { label: 'Copy as fetch', onPress: () => Clipboard.setStringAsync(buildFetchCommand(entry)) },
    {
      label: 'Copy as fetch (Node.js)',
      onPress: () => Clipboard.setStringAsync(buildNodeFetchCommand(entry)),
    },
    ...(entry.requestBody
      ? [
          {
            label: 'Copy request payload',
            onPress: () => Clipboard.setStringAsync(entry.requestBody as string),
          },
        ]
      : []),
    ...(entry.responseBody
      ? [
          {
            label: 'Copy response',
            onPress: () => Clipboard.setStringAsync(entry.responseBody as string),
          },
        ]
      : []),
    // Offered for bytes as well as text, which is the only way to get an image or a PDF out.
    ...(entry.responseBody !== undefined || entry.responseBase64 !== undefined
      ? [
          {
            label: 'Share response body',
            onPress: () => {
              shareResponseBody(entry).catch(() => {});
            },
          },
        ]
      : []),
    {
      label: blocked ? 'Stop blocking this URL' : 'Block this URL',
      onPress: () =>
        blocked
          ? networkOverridesStore.remove(entry.url)
          : networkOverridesStore.set({ url: entry.url, action: 'block' }),
    },
    ...(onOverride ? [{ label: 'Override response…', onPress: () => onOverride(entry.url) }] : []),
  ];
}
