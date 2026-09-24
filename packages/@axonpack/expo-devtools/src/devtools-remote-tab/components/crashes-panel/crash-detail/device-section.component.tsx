import { formatSize } from '../../../../core/utils/format-bytes.util';
import type { CrashRecord } from '../../../../features/crash/stores/crash.store';

/** Folded away, as in the app: it is what you read after the stack, if at all. */
export function DeviceSection({ record }: { record: CrashRecord }) {
  const device = record.device;
  const rows: [string, string | undefined][] = [
    ['Platform', device?.platform],
    ['OS version', device?.osVersion],
    ['Model', device?.model],
    ['Brand', device?.brand],
    ['App version', device?.appVersion],
    ['Build', device?.buildVersion],
    ['Bundle id', device?.bundleId],
    ['Emulator', device?.isEmulator === undefined ? undefined : device.isEmulator ? 'yes' : 'no'],
    ['JS engine', device?.jsEngine],
    ['React Native', device?.reactNativeVersion],
    ['Total memory', device?.totalMemoryBytes ? formatSize(device.totalMemoryBytes) : undefined],
    [
      'Available memory',
      device?.availableMemoryBytes ? formatSize(device.availableMemoryBytes) : undefined,
    ],
  ];
  const present = rows.filter((row): row is [string, string] => row[1] !== undefined);

  return (
    <details className="axonpack-net-section">
      <summary>Device ({present.length})</summary>
      {present.length === 0 && (
        <p className="axonpack-net-none">No device information was recorded</p>
      )}
      <div className="axonpack-net-kv">
        {present.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      {present.length <= 3 && (
        <p className="axonpack-crash-note">
          Device details come from this package&apos;s native module. In Expo Go only what
          JavaScript can see is recorded.
        </p>
      )}
    </details>
  );
}
