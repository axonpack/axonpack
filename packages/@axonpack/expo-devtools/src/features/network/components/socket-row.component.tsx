import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { InfoBadge } from '../../../core/components/ui/info-badge.ui';
import type { Palette } from '../../../core/constants/theme.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import type { WebSocketLogEntry, WebSocketStatus } from '../stores/network-log.store';
import { getDisplayNameWithQuery } from '../utils/formatters.util';

/** A socket has no status code, so its lifecycle is what the colour has to carry. */
function statusColor(status: WebSocketStatus, COLORS: Palette): string {
  if (status === 'error') return COLORS.error;
  if (status === 'open') return COLORS.success;
  if (status === 'closed') return COLORS.textSecondary;
  return COLORS.warning;
}

function SocketRowComponent({
  entry,
  messageCount,
  bigRows,
  onPress,
}: {
  entry: WebSocketLogEntry;
  messageCount: number;
  bigRows: boolean;
  onPress: (entry: WebSocketLogEntry) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();

  return (
    <TouchableOpacity onPress={() => onPress(entry)} style={[styles.row, bigRows && styles.rowBig]}>
      <View style={styles.topRow}>
        <Text style={[styles.method, { color: COLORS.accent }]}>{entry.method}</Text>
        <Text style={[styles.status, { color: statusColor(entry.status, COLORS) }]}>
          {entry.status.toUpperCase()}
        </Text>
        <Text style={styles.timing} numberOfLines={1}>
          {new Date(entry.startedAt).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.url} numberOfLines={bigRows ? 2 : 1}>
        {getDisplayNameWithQuery(entry.url)}
      </Text>
      {bigRows && (
        <View style={styles.badges}>
          <InfoBadge icon="swap-vert" label={`${messageCount} msg`} />
          {entry.closeCode !== undefined && <InfoBadge label={`code ${entry.closeCode}`} />}
          {entry.error !== undefined && <InfoBadge icon="error-outline" label={entry.error} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

export const SocketRow = memo(SocketRowComponent);

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowBig: {
    paddingVertical: 8,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  method: {
    fontSize: 11,
    fontWeight: '700',
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
  },
  timing: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  url: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
}));
