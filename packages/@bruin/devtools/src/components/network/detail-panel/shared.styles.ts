import { StyleSheet } from 'react-native';

import { COLORS } from '../../../constants/colors.const';

// Row/text styles shared across the Headers, Preview, Response, and Timing tabs.
export const rowStyles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerKey: {
    width: 140,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  headerValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  // Header/field name accent — same color across General, and both the column and
  // stacked Request/Response header layouts, so toggling the view only changes layout.
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
    marginBottom: 2,
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
});
