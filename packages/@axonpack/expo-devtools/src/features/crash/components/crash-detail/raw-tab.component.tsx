import { Text, View } from 'react-native';

import { useCrashDetailStyles } from './shared.styles';
import type { CrashRecord } from '../../stores/crash.store';
import { formatCrashJson } from '../../utils/format-crash-report.util';

export function RawTab({ record }: { record: CrashRecord }) {
  const styles = useCrashDetailStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.monospace} selectable>
        {formatCrashJson(record)}
      </Text>
    </View>
  );
}
