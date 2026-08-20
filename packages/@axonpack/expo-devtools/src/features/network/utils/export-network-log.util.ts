import { Platform, Share } from 'react-native';

import type { NetworkLogEntry } from '../stores/network-log.store';
import { encodeBase64 } from '../../../core/utils/base64.util';

function fileName(): string {
  return `network-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

/**
 * Hands the given entries to the OS share sheet as JSON.
 *
 * Built on `Share` alone, so there's no filesystem to write to and nothing here produces a file on disk.
 * On iOS a base64 `data:` URL is passed alongside the text, which is what gives the sheet a named
 * attachment to offer Files and Mail; Android's `Share` accepts only text, so it receives the JSON
 * itself. Either way the log leaves the app in one step.
 */
export async function exportNetworkLog(entries: NetworkLogEntry[]) {
  const text = JSON.stringify(entries, null, 2);

  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        title: fileName(),
        message: text,
        url: `data:application/json;base64,${encodeBase64(text)}`,
      });
      return;
    }
    await Share.share({ title: fileName(), message: text });
  } catch {
    // The user dismissed the sheet, or there's nothing installed to share to.
  }
}
