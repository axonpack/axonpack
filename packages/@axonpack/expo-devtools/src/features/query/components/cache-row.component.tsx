import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';

/** One row for a query or a mutation: the key, a status word, and a line of detail under it. */
function CacheRowBase({
  id,
  title,
  status,
  statusColor,
  detail,
  onPress,
}: {
  id: string;
  title: string;
  status: string;
  statusColor: string;
  detail: string;
  onPress: (id: string) => void;
}) {
  const styles = useStyles();
  return (
    <TouchableOpacity onPress={() => onPress(id)} style={styles.row}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.status, { color: statusColor, borderColor: statusColor }]}>
          {status}
        </Text>
      </View>
      <Text style={styles.detail} numberOfLines={1}>
        {detail}
      </Text>
    </TouchableOpacity>
  );
}

export const CacheRow = memo(CacheRowBase);

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 12,
    fontFamily: MONOSPACE,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  status: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
  },
  detail: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
}));
