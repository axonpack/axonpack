import * as Clipboard from 'expo-clipboard';

import type { NetworkLogEntry } from '../../stores/network/network-log.store';

/**
 * Puts the given entries on the clipboard as JSON.
 *
 * The whole log, not a file: nothing here needs a filesystem dependency, and a clipboard paste lands
 * wherever you were already going to look at it. Callers get the promise so they can confirm the copy —
 * a clipboard write is invisible otherwise.
 */
export async function copyNetworkLog(entries: NetworkLogEntry[]) {
  await Clipboard.setStringAsync(JSON.stringify(entries, null, 2));
}
