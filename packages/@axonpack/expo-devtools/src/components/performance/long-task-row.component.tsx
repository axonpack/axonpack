import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import type { LongTaskEntry } from '../../stores/performance/performance.store';
import { formatMs, getLongTaskColor } from '../../utils/performance/format-metrics.util';
import { formatLongTaskName } from '../../utils/performance/long-task-name.util';

function LongTaskRowBase({ entry }: { entry: LongTaskEntry }) {
  return (
    <View style={styles.row}>
      <View style={[styles.marker, { backgroundColor: getLongTaskColor(entry.duration) }]} />
      <Text style={styles.name} numberOfLines={1}>
        {formatLongTaskName(entry.name)}
      </Text>
      <Text style={styles.at}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
      <Text style={[styles.duration, { color: getLongTaskColor(entry.duration) }]}>
        {formatMs(entry.duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  marker: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  name: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  at: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  duration: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

export const LongTaskRow = memo(LongTaskRowBase);
