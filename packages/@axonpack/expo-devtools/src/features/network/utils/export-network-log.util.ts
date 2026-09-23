import { Platform, Share } from 'react-native';

import { buildNetworkExport } from './build-network-export.util';
import { encodeBase64 } from '../../../core/utils/base64.util';
import { networkLogStore, type NetworkEntry } from '../stores/network-log.store';

export function networkLogFileName(): string {
  return `network-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

/** The export file's text. Shared with the React Native DevTools tab, which downloads it instead. */
export function networkLogJson(entries: readonly NetworkEntry[]): string {
  // The messages and events are looked up here rather than passed in: the caller has a list of rows,
  // and what belongs to each row lives beside it in the store.
  const file = buildNetworkExport(
    entries,
    {
      messagesFor: networkLogStore.getWebSocketMessages,
      eventsFor: networkLogStore.getStreamEvents,
    },
    new Date().toISOString()
  );
  return JSON.stringify(file, null, 2);
}

/**
 * Hands the given entries to the OS share sheet as JSON.
 *
 * Built on `Share` alone, so there's no filesystem to write to and nothing here produces a file on disk.
 * On iOS a base64 `data:` URL is passed alongside the text, which is what gives the sheet a named
 * attachment to offer Files and Mail; Android's `Share` accepts only text, so it receives the JSON
 * itself. Either way the log leaves the app in one step.
 */
export async function exportNetworkLog(entries: readonly NetworkEntry[]) {
  const text = networkLogJson(entries);

  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        title: networkLogFileName(),
        message: text,
        url: `data:application/json;base64,${encodeBase64(text)}`,
      });
      return;
    }
    await Share.share({ title: networkLogFileName(), message: text });
  } catch {
    // The user dismissed the sheet, or there's nothing installed to share to.
  }
}
