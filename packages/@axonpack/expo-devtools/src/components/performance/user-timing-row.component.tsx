import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import type { UserTimingEntry } from '../../stores/performance/performance.store';
import { formatMs } from '../../utils/performance/format-metrics.util';

function UserTimingRowBase({ entry }: { entry: UserTimingEntry }) {
  const isMark = entry.kind === 'mark';

  return (
    <View style={styles.row}>
      <MaterialIcons
        name={isMark ? 'push-pin' : 'straighten'}
        size={13}
        color={COLORS.textSecondary}
      />
      <Text style={styles.name} numberOfLines={1}>
        {entry.name}
      </Text>
      {entry.detail !== undefined ? (
        <Text style={styles.at} numberOfLines={1}>
          {entry.detail}
        </Text>
      ) : null}
      <Text style={styles.at}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
      {/* A mark is a point in time, so a "0 ms" duration would read as a suspiciously fast span. */}
      <Text style={styles.duration}>{isMark ? '—' : formatMs(entry.duration)}</Text>
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
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});

/**
 * Re-renders only when the row is a different entry.
 *
 * `entry` is this component's only prop, and the store never patches a recorded entry — it prepends and
 * trims. So any field that could differ belongs to a different entry, which the id already tells us.
 */
export const UserTimingRow = memo(
  UserTimingRowBase,
  (prev, next) => prev.entry.id === next.entry.id
);
