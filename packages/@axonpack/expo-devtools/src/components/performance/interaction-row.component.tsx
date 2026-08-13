import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { InteractionEntry } from '../../stores/performance/performance.store';
import { formatMs, getLongTaskColor } from '../../utils/performance/format-metrics.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

function InteractionRowBase({ entry }: { entry: InteractionEntry }) {
  const COLORS = useThemeColors();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View
        style={[styles.marker, { backgroundColor: getLongTaskColor(entry.duration, COLORS) }]}
      />
      <Text style={styles.name} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={styles.handler}>handler {formatMs(entry.processingDuration)}</Text>
      <Text style={[styles.duration, { color: getLongTaskColor(entry.duration, COLORS) }]}>
        {formatMs(entry.duration)}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
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
}));

export const InteractionRow = memo(
  InteractionRowBase,
  (prev, next) => prev.entry.id === next.entry.id
);
