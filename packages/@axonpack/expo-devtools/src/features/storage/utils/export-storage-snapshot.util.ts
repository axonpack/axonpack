import { Platform, Share } from 'react-native';

import { buildStorageExport } from './build-storage-export.util';
import { encodeBase64 } from '../../../core/utils/base64.util';
import type { StorageAdapter } from '../services/define-adapter.service';
import type { StorageEntry } from '../stores/storage.store';

function fileName(adapterName: string): string {
  const slug = adapterName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `storage-${slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

/**
 * Hands the currently-filtered entries to the OS share sheet as JSON, the same `Share`-only route
 * the network export takes — no filesystem module, so nothing is written to disk. iOS additionally
 * gets a base64 `data:` URL so the sheet has a named attachment for Files and Mail.
 */
export async function exportStorageSnapshot(adapter: StorageAdapter, entries: StorageEntry[]) {
  const text = JSON.stringify(
    buildStorageExport(adapter, entries, new Date().toISOString()),
    null,
    2
  );

  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        title: fileName(adapter.name),
        message: text,
        url: `data:application/json;base64,${encodeBase64(text)}`,
      });
      return;
    }
    await Share.share({ title: fileName(adapter.name), message: text });
  } catch {
    // The user dismissed the sheet, or there's nothing installed to share to.
  }
}
