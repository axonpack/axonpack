import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MONOSPACE } from '../../constants/typography.const';
import { hexDump } from '../../utils/hex-dump.util';
import { makeThemedStyles } from '../../utils/themed-styles.util';

export function HexView({ base64 }: { base64: string }) {
  const styles = useStyles();
  const { rows, hiddenBytes } = hexDump(base64);

  return (
    <ScrollView horizontal contentContainerStyle={styles.content}>
      <View>
        {rows.map((row) => (
          <View key={row.offset} style={styles.row}>
            <Text style={styles.offset} selectable>
              {row.offset}
            </Text>
            <Text style={styles.bytes} selectable>
              {row.bytes}
            </Text>
            <Text style={styles.ascii} selectable>
              {row.ascii}
            </Text>
          </View>
        ))}
        {hiddenBytes > 0 && (
          <Text style={styles.note}>{`… ${hiddenBytes} more bytes not shown`}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  content: {
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  offset: {
    fontFamily: MONOSPACE,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  bytes: {
    fontFamily: MONOSPACE,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textPrimary,
  },
  ascii: {
    fontFamily: MONOSPACE,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  note: {
    paddingTop: 6,
    fontSize: 10,
    color: COLORS.textSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
}));
