import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HighlightedText } from '../../../core/components/ui/highlighted-text.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { findMatches, type Matcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import type { ReduxActionEntry } from '../stores/redux.store';
import { formatActionPreview, formatClockTime } from '../utils/format-redux.util';

function ActionRowComponent({
  entry,
  matcher,
  onPress,
}: {
  entry: ReduxActionEntry;
  matcher: Matcher | null;
  onPress: (entry: ReduxActionEntry) => void;
}) {
  const styles = useStyles();
  const preview = formatActionPreview(entry.action);
  // Reference equality is the whole check: a reducer that changed nothing returns the same object.
  const unchanged = entry.prevState === entry.state;

  return (
    <TouchableOpacity
      style={[styles.row, unchanged && styles.rowUnchanged]}
      onPress={() => onPress(entry)}>
      <View style={styles.topRow}>
        <HighlightedText
          text={entry.type}
          ranges={findMatches(entry.type, matcher)}
          style={styles.type}
          numberOfLines={1}
        />
        {unchanged && <Text style={styles.unchanged}>no change</Text>}
        <Text style={styles.time}>{formatClockTime(entry.timestamp)}</Text>
      </View>
      {preview && (
        <HighlightedText
          text={preview}
          ranges={findMatches(preview, matcher)}
          style={styles.payload}
          numberOfLines={1}
        />
      )}
    </TouchableOpacity>
  );
}

export const ActionRow = memo(ActionRowComponent);

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowUnchanged: {
    opacity: 0.6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  type: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  unchanged: {
    fontSize: 10,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  time: {
    flex: 1,
    fontFamily: MONOSPACE,
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  payload: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
}));
