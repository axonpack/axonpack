import { StyleSheet } from 'react-native';

import { COLORS } from '../../../../constants/colors.const';

export const treeStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  toggle: {
    width: 14,
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
