import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import type { InteractionEntry } from '../../stores/performance/performance.store';
import { formatMs, getLongTaskColor } from '../../utils/performance/format-metrics.util';

function InteractionRowBase({ entry }: { entry: InteractionEntry }) {
  return (
    <View style={styles.row}>
      <View style={[styles.marker, { backgroundColor: getLongTaskColor(entry.duration) }]} />
      <Text style={styles.name} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={styles.handler}>handler {formatMs(entry.processingDuration)}</Text>
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
  handler: {
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

/**
 * Re-renders only when the row is a different entry.
 *
 * `entry` is this component's only prop, and the store never patches a recorded entry — it prepends and
 * trims. So any field that could differ belongs to a different entry, which the id already tells us.
 */
export const InteractionRow = memo(
  InteractionRowBase,
  (prev, next) => prev.entry.id === next.entry.id
);
