import { Share } from 'react-native';

import type { NetworkLogEntry } from '../../stores/network/network-log.store';

/** Shares the given entries as JSON via the OS share sheet — no filesystem dependency needed. */
export async function exportNetworkLog(entries: NetworkLogEntry[]) {
  try {
    await Share.share({
      title: 'Network log',
      message: JSON.stringify(entries, null, 2),
    });
  } catch {
    // user dismissed the share sheet, or sharing isn't available — nothing to recover.
  }
}
