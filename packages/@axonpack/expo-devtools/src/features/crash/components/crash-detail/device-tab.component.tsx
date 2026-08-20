import { Text, View } from 'react-native';

import { useCrashDetailStyles } from './shared.styles';
import { formatSize } from '../../../../core/utils/format-bytes.util';
import type { CrashRecord } from '../../stores/crash.store';

export function DeviceTab({ record }: { record: CrashRecord }) {
  const styles = useCrashDetailStyles();
  const device = record.device;

  if (!device) {
    return <Text style={styles.emptyText}>No device information was recorded</Text>;
  }

  const rows: [string, string | undefined][] = [
    ['Platform', device.platform],
    ['OS version', device.osVersion],
    ['Model', device.model],
    ['Brand', device.brand],
    ['App version', device.appVersion],
    ['Build', device.buildVersion],
    ['Bundle id', device.bundleId],
    ['Emulator', device.isEmulator === undefined ? undefined : device.isEmulator ? 'yes' : 'no'],
    ['JS engine', device.jsEngine],
    ['React Native', device.reactNativeVersion],
    ['Total memory', device.totalMemoryBytes ? formatSize(device.totalMemoryBytes) : undefined],
    [
      'Available memory',
      device.availableMemoryBytes ? formatSize(device.availableMemoryBytes) : undefined,
    ],
  ];

  const present = rows.filter((row): row is [string, string] => row[1] !== undefined);

  return (
    <View style={styles.section}>
      {present.map(([label, value]) => (
        <View key={label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue} selectable>
            {value}
          </Text>
        </View>
      ))}

      {/* The device block is filled by the native module; without a dev build there is nothing to
          ask, so the report carries only what JS itself knows. */}
      {present.length <= 3 && (
        <Text style={styles.note}>
          Device details come from this package&apos;s native module. In Expo Go only what
          JavaScript can see is recorded.
        </Text>
      )}
    </View>
  );
}
