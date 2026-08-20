import { StyleSheet, Text, View } from 'react-native';

import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import type { WebSocketMessage } from '../stores/network-log.store';

export function SocketMessageRow({ message }: { message: WebSocketMessage }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const sent = message.direction === 'sent';

  return (
    <View style={styles.row}>
      {/* Direction is the first thing you read down a stream, so it carries the colour. */}
      <Text style={[styles.arrow, { color: sent ? COLORS.accent : COLORS.success }]}>
        {sent ? '▲' : '▼'}
      </Text>
      <Text style={styles.data} numberOfLines={4} selectable>
        {message.data}
      </Text>
      <View style={styles.meta}>
        {message.messageType === 'binary' && <Text style={styles.kind}>BIN</Text>}
        <Text style={styles.time}>{new Date(message.timestamp).toLocaleTimeString()}</Text>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  arrow: {
    fontSize: 10,
    lineHeight: 16,
  },
  data: {
    flex: 1,
    fontFamily: MONOSPACE,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textPrimary,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  kind: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  time: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
}));
