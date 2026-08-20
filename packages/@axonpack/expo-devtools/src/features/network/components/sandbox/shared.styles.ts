import { StyleSheet } from 'react-native';

import { TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';

export const useSandboxStyles = makeThemedStyles((COLORS) => ({
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
}));
