import { StyleSheet } from 'react-native';

import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';

export const useCrashDetailStyles = makeThemedStyles((COLORS) => ({
  section: {
    gap: 8,
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 17,
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
    width: 118,
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
  frameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingVertical: 3,
  },
  frameIndex: {
    width: 22,
    fontSize: 10,
    fontFamily: 'monospace',
    color: COLORS.textSecondary,
  },
  frameBody: {
    flex: 1,
  },
  frameFn: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  frameLocation: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  /** Vendor frames stay readable but stop competing with app frames for attention. */
  frameVendor: {
    opacity: 0.55,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
}));
