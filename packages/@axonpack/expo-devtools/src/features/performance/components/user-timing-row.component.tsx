import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { UserTimingEntry } from '../stores/performance.store';
import { formatMs } from '../utils/format-metrics.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';

function UserTimingRowBase({ entry }: { entry: UserTimingEntry }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
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
      {}
      <Text style={styles.duration}>{isMark ? '—' : formatMs(entry.duration)}</Text>
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
}));

export const UserTimingRow = memo(
  UserTimingRowBase,
  (prev, next) => prev.entry.id === next.entry.id
);
