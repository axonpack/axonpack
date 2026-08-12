import { StyleSheet } from 'react-native';

import { COLORS } from '../../../constants/colors.const';
import { TOUCH_TARGET } from '../../../constants/metrics.const';

export const sandboxStyles = StyleSheet.create({
  section: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: TOUCH_TARGET.min,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  // Bordered/tinted box so a key or value field visibly reads as editable, not static text.
  fieldBox: {
    fontSize: 13,
    minHeight: TOUCH_TARGET.dense,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.sectionTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  // The checkbox and the remove button: dense boxes inside a 44dp row, so both are square and centred
  // rather than being exactly as big as their glyph.
  rowAction: {
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyField: {
    flex: 0.4,
  },
  valueField: {
    flex: 0.6,
  },
  codeSnippet: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.sectionTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 10,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
