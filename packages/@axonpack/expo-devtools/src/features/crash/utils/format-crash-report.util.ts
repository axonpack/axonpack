import type { CrashDeviceInfo, CrashKind, CrashRecord } from '../stores/crash.store';

export const CRASH_KIND_LABELS: Record<CrashKind, string> = {
  'js-fatal': 'Fatal JS error',
  'js-error': 'JS error',
  'unhandled-rejection': 'Unhandled rejection',
  'react-render': 'Render error',
  'native-exception': 'Native exception',
};

export function formatCrashTitle(record: CrashRecord): string {
  return record.message ? `${record.name}: ${record.message}` : record.name;
}

export function formatCrashTime(timestamp: number): string {
  const date = new Date(timestamp);
  const time = date.toTimeString().slice(0, 8);
  return `${date.toISOString().slice(0, 10)} ${time}`;
}

function deviceLines(device: CrashDeviceInfo | undefined): string[] {
  if (!device) return [];
  const rows: [string, unknown][] = [
    ['Platform', device.platform],
    ['OS version', device.osVersion],
    ['Model', device.model],
    ['Brand', device.brand],
    ['App version', device.appVersion],
    ['Build', device.buildVersion],
    ['Bundle id', device.bundleId],
    ['Emulator', device.isEmulator],
    ['JS engine', device.jsEngine],
    ['React Native', device.reactNativeVersion],
  ];
  return rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `- ${label}: ${String(value)}`);
}

/**
 * Markdown rather than plain text because the destination is almost always an issue tracker or a
 * chat window, and both render it. The fenced blocks are what keep a stack trace from being
 * re-wrapped into nonsense on the way.
 */
export function formatCrashReport(record: CrashRecord): string {
  const sections: string[] = [
    `## ${CRASH_KIND_LABELS[record.kind]}`,
    '',
    `**${formatCrashTitle(record)}**`,
    '',
    `Captured ${formatCrashTime(record.timestamp)}${
      record.fromPreviousLaunch ? ' (previous launch)' : ''
    }`,
  ];

  if (record.stack) {
    sections.push('', '### Stack', '', '```', record.stack, '```');
  }

  if (record.componentStack) {
    sections.push('', '### Component stack', '', '```', record.componentStack.trim(), '```');
  }

  if (record.native?.frames?.length) {
    sections.push('', '### Native frames', '', '```', record.native.frames.join('\n'), '```');
  }

  const device = deviceLines(record.device);
  if (device.length > 0) sections.push('', '### Device', '', ...device);

  if (record.context && Object.keys(record.context).length > 0) {
    sections.push('', '### Context', '', '```json', safeStringify(record.context), '```');
  }

  if (record.breadcrumbs?.length) {
    sections.push(
      '',
      '### Breadcrumbs',
      '',
      '```',
      ...record.breadcrumbs.map(
        (crumb) =>
          `${formatCrashTime(crumb.at)}  ${crumb.category}${
            crumb.level ? `/${crumb.level}` : ''
          }  ${crumb.message}`
      ),
      '```'
    );
  }

  return sections.join('\n');
}

export function formatCrashJson(record: CrashRecord): string {
  return safeStringify(record);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}
