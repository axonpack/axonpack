import * as Clipboard from 'expo-clipboard';

import { buildCurlCommand } from './curl.util';
import { buildFetchCommand, buildNodeFetchCommand } from './fetch-snippet.util';
import { shareResponseBody } from './share-response-body.util';
import type { ContextMenuItem } from '../../../core/components/ui/context-menu.ui';
import type { NetworkLogEntry } from '../stores/network-log.store';
import { networkOverridesStore } from '../stores/network-overrides.store';

/**
 * What each copy item copies, apart from how it is copied: the app writes these to its own
 * clipboard, and the DevTools tab has the browser write them to the computer's.
 */
export function entryCopyTexts(entry: NetworkLogEntry): { label: string; text: string }[] {
  return [
    { label: 'Copy URL', text: entry.url },
    { label: 'Copy as cURL', text: buildCurlCommand(entry) },
    { label: 'Copy as fetch', text: buildFetchCommand(entry) },
    { label: 'Copy as fetch (Node.js)', text: buildNodeFetchCommand(entry) },
    ...(entry.requestBody ? [{ label: 'Copy request payload', text: entry.requestBody }] : []),
    ...(entry.responseBody ? [{ label: 'Copy response', text: entry.responseBody }] : []),
  ];
}

/** Block and override: the items that act on the app itself, the same from either surface. */
export function entryRuleMenuItems(
  entry: NetworkLogEntry,
  onOverride?: (entry: NetworkLogEntry) => void
): ContextMenuItem[] {
  const blocked = networkOverridesStore.find(entry.url)?.action === 'block';

  return [
    {
      label: blocked ? 'Stop blocking this URL' : 'Block this URL',
      onPress: () =>
        blocked
          ? networkOverridesStore.remove(entry.url)
          : networkOverridesStore.set({ url: entry.url, action: 'block' }),
    },
    ...(onOverride ? [{ label: 'Override response…', onPress: () => onOverride(entry) }] : []),
  ];
}

export function buildEntryCopyMenuItems(
  entry: NetworkLogEntry,
  /** Opens the override sheet on this entry. Absent where there is no sheet to open. */
  onOverride?: (entry: NetworkLogEntry) => void
): ContextMenuItem[] {
  return [
    ...entryCopyTexts(entry).map(({ label, text }) => ({
      label,
      onPress: () => Clipboard.setStringAsync(text),
    })),
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
    ...entryRuleMenuItems(entry, onOverride),
  ];
}
