import { StyleSheet } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { TOUCH_TARGET } from '../../constants/metrics.const';

export const treeStyles = StyleSheet.create({
  // The row is the expand/collapse target, so it takes the dense floor rather than the full 44 — a tree
  // is read far more than it is tapped, and 44dp per line would double the height of every payload.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: TOUCH_TARGET.dense,
    paddingVertical: 4,
  },
  toggle: {
    width: 16,
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    flexWrap: 'wrap',
  },
  key: {
    color: COLORS.jsonKey,
  },
  punctuation: {
    color: COLORS.textSecondary,
  },
  string: {
    color: COLORS.jsonString,
  },
  number: {
    color: COLORS.jsonNumber,
  },
  boolean: {
    color: COLORS.jsonNumber,
  },
  nullValue: {
    color: COLORS.textSecondary,
  },
});
