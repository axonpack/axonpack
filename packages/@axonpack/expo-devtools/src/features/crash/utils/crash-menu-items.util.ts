import * as Clipboard from 'expo-clipboard';

import { exportCrashReport } from './export-crash-report.util';
import { formatCrashJson, formatCrashReport, formatCrashTitle } from './format-crash-report.util';
import type { ContextMenuItem } from '../../../core/components/ui/context-menu.ui';
import type { CrashRecord } from '../stores/crash.store';

export function buildCrashMenuItems(record: CrashRecord): ContextMenuItem[] {
  return [
    {
      label: 'Copy message',
      onPress: () => Clipboard.setStringAsync(formatCrashTitle(record)),
    },
    ...(record.stack
      ? [{ label: 'Copy stack', onPress: () => Clipboard.setStringAsync(record.stack ?? '') }]
      : []),
    {
      label: 'Copy report (Markdown)',
      onPress: () => Clipboard.setStringAsync(formatCrashReport(record)),
    },
    {
      label: 'Copy report (JSON)',
      onPress: () => Clipboard.setStringAsync(formatCrashJson(record)),
    },
    { label: 'Share report', onPress: () => exportCrashReport(record) },
  ];
}
