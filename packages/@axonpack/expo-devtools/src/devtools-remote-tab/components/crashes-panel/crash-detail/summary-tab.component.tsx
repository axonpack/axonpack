import type { CSSProperties } from 'react';

import { DeviceSection } from './device-section.component';
import { StackSection } from './stack-section.component';
import type { Palette } from '../../../../core/constants/theme.const';
import { getCrashKindVisual } from '../../../../features/crash/constants/crash-kind-visuals.const';
import type { CrashRecord } from '../../../../features/crash/stores/crash.store';
import {
  CRASH_KIND_LABELS,
  formatCrashTime,
} from '../../../../features/crash/utils/format-crash-report.util';
import { CRASH_KIND_ICONS } from '../../../constants/console-icons.const';

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** The kind, name and message, then what is known about it, then the stack and the device. */
export function SummaryTab({ record, palette }: { record: CrashRecord; palette: Palette }) {
  const style = { '--row-color': getCrashKindVisual(record.kind, palette).color } as CSSProperties;
  const facts: [string, string][] = [['Captured', formatCrashTime(record.timestamp)]];
  if (record.native?.type !== undefined) facts.push(['Exception', record.native.type]);
  if (record.native?.thread !== undefined) facts.push(['Thread', record.native.thread]);
  if (record.route !== undefined) {
    facts.push([
      'Route',
      record.route.path ? `${record.route.name} (${record.route.path})` : record.route.name,
    ]);
  }
  for (const [key, value] of Object.entries(record.context ?? {})) {
    facts.push([key, stringify(value)]);
  }

  return (
    <div>
      <div
        className="axonpack-crash-banner"
        style={style}
        data-con-icon={CRASH_KIND_ICONS[record.kind]}>
        <div>
          <div className="axonpack-crash-banner-kind">{CRASH_KIND_LABELS[record.kind]}</div>
          <div>{record.name}</div>
        </div>
      </div>
      <div className="axonpack-crash-report-message">{record.message || '(no message)'}</div>
      <div className="axonpack-net-kv">
        {facts.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      {record.fromPreviousLaunch && (
        <p className="axonpack-crash-note">
          Recorded during an earlier run of the app and read back at launch. The process did not
          survive it.
        </p>
      )}
      <StackSection record={record} />
      <DeviceSection record={record} />
    </div>
  );
}
