import * as Clipboard from 'expo-clipboard';

import { buildCurlCommand } from './curl.util';
import { buildFetchCommand, buildNodeFetchCommand } from './fetch-snippet.util';
import { shareResponseBody } from './share-response-body.util';
import type { ContextMenuItem } from '../../../core/components/ui/context-menu.ui';
import type { NetworkLogEntry } from '../stores/network-log.store';

export function buildEntryCopyMenuItems(entry: NetworkLogEntry): ContextMenuItem[] {
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
  ];
}
