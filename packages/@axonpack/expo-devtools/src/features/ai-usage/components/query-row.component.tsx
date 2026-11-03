import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MONOSPACE } from '../../../core/constants/typography.const';
import { formatDuration } from '../../../core/utils/format-duration.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import type { AiUsageEntry } from '../stores/ai-usage.store';
import { formatClockTime, formatMatched } from '../utils/format-ai-usage.util';

function QueryRowComponent({
  entry,
  onPress,
}: {
  entry: AiUsageEntry;
  onPress: (id: string) => void;
}) {
  const styles = useStyles();

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(entry.id)}>
      <View style={styles.topRow}>
        <Text style={styles.command} numberOfLines={1}>
          {entry.command}
        </Text>
        <Text style={styles.time}>{formatClockTime(entry.timestamp)}</Text>
      </View>
      <View style={styles.topRow}>
        {entry.error !== undefined ? (
          <Text style={styles.error} numberOfLines={1}>
            {entry.error}
          </Text>
        ) : (
          <Text style={styles.meta}>{formatMatched(entry)}</Text>
        )}
        <Text style={styles.meta}>{formatDuration(entry.duration)}</Text>
      </View>
    </TouchableOpacity>
  );
}

/** An entry is never replaced once stored, so this skips every row but a new one. */
export const QueryRow = memo(QueryRowComponent);

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  command: {
    flex: 1,
    fontFamily: MONOSPACE,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  time: {
    fontFamily: MONOSPACE,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  meta: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  error: {
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.error,
  },
}));
