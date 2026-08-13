import { StyleSheet } from 'react-native';

import { makeThemedStyles } from '../../../utils/themed-styles.util';

export const useRowStyles = makeThemedStyles((COLORS) => ({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },

  headerListKey: {
    width: 140,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.keyAccent,
  },
  stackedRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  stackedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },

  stackedKey: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.keyAccent,
  },
  stackedValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
}));
