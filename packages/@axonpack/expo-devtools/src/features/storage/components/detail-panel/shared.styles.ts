import { StyleSheet } from 'react-native';

import { MONOSPACE } from '../../../../core/constants/typography.const';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';

export const useDetailStyles = makeThemedStyles((COLORS) => ({
  section: {
    gap: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  monospace: {
    fontFamily: MONOSPACE,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    width: 110,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.keyAccent,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  /** Takes the slack in a toolbar row so the trailing button stays pinned right. */
  toolbarNote: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  error: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.error,
  },
}));
