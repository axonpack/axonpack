import { Platform, Share } from 'react-native';

import type { StorageEntry } from '../../stores/storage/storage.store';
import { encodeBase64 } from '../base64.util';

function fileName(adapterName: string): string {
  const slug = adapterName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `storage-${slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

/**
 * Hands the currently-filtered entries to the OS share sheet as JSON, the same `Share`-only route
 * the network export takes — no filesystem module, so nothing is written to disk. iOS additionally
 * gets a base64 `data:` URL so the sheet has a named attachment for Files and Mail.
 */
export async function exportStorageSnapshot(adapterName: string, entries: StorageEntry[]) {
  const text = JSON.stringify(
    {
      store: adapterName,
      exportedAt: new Date().toISOString(),
      entries: entries.map((entry) => ({
        key: entry.key,
        value: entry.text,
        type: entry.valueType,
        bytes: entry.size,
      })),
    },
    null,
    2
  );

  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        title: fileName(adapterName),
        message: text,
        url: `data:application/json;base64,${encodeBase64(text)}`,
      });
      return;
    }
    await Share.share({ title: fileName(adapterName), message: text });
  } catch {
    // The user dismissed the sheet, or there's nothing installed to share to.
  }
}
