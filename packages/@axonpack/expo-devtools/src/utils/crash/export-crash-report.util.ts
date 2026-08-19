import { Platform, Share } from 'react-native';

import { formatCrashJson, formatCrashReport } from './format-crash-report.util';
import type { CrashRecord } from '../../stores/crash/crash.store';
import { encodeBase64 } from '../base64.util';

function fileName(record: CrashRecord): string {
  return `crash-${new Date(record.timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
}

/**
 * Same `Share`-only approach as the network log export — nothing is written to disk, so there is no
 * filesystem module here either. The share sheet gets the readable markdown as its message and, on
 * iOS, the full JSON as a named attachment; Android's `Share` takes text only.
 */
export async function exportCrashReport(record: CrashRecord) {
  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        title: fileName(record),
        message: formatCrashReport(record),
        url: `data:application/json;base64,${encodeBase64(formatCrashJson(record))}`,
      });
      return;
    }
    await Share.share({ title: fileName(record), message: formatCrashReport(record) });
  } catch {
    // The user dismissed the sheet, or there's nothing installed to share to.
  }
}
