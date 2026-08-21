import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MONOSPACE } from '../../constants/typography.const';
import { decodeBase64ToBytes } from '../../utils/base64.util';
import { makeThemedStyles } from '../../utils/themed-styles.util';

const BYTES_PER_ROW = 16;
/** Enough to see what a body is without laying out thousands of rows nobody scrolls to. */
const MAX_ROWS = 512;

function hex(byte: number): string {
  return byte.toString(16).padStart(2, '0');
}

/** The printable-ASCII column, where anything else is a dot — as every hex dump has always done. */
function printable(byte: number): string {
  return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.';
}

export function HexView({ base64 }: { base64: string }) {
  const styles = useStyles();
  const bytes = decodeBase64ToBytes(base64);
  const rowCount = Math.min(Math.ceil(bytes.length / BYTES_PER_ROW), MAX_ROWS);
  const rows = Array.from({ length: rowCount }, (_, row) =>
    bytes.subarray(row * BYTES_PER_ROW, row * BYTES_PER_ROW + BYTES_PER_ROW)
  );
  const shown = rowCount * BYTES_PER_ROW;

  return (
    <ScrollView horizontal contentContainerStyle={styles.content}>
      <View>
        {rows.map((row, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.offset} selectable>
              {(index * BYTES_PER_ROW).toString(16).padStart(8, '0')}
            </Text>
            <Text style={styles.bytes} selectable>
              {Array.from(row, hex)
                .join(' ')
                .padEnd(BYTES_PER_ROW * 3 - 1, ' ')}
            </Text>
            <Text style={styles.ascii} selectable>
              {Array.from(row, printable).join('')}
            </Text>
          </View>
        ))}
        {bytes.length > shown && (
          <Text style={styles.note}>{`… ${bytes.length - shown} more bytes not shown`}</Text>
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
