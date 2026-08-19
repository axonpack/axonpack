import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getCrashKindVisual } from '../../constants/crash/crash-kind-visuals.const';
import type { CrashRecord } from '../../stores/crash/crash.store';
import { CRASH_KIND_LABELS, formatCrashTime } from '../../utils/crash/format-crash-report.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { InfoBadge } from '../ui/info-badge.ui';

function CrashRowComponent({
  record,
  onPress,
}: {
  record: CrashRecord;
  onPress: (record: CrashRecord) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const visual = getCrashKindVisual(record.kind, COLORS);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(record)}>
      <MaterialIcons name={visual.icon} size={16} color={visual.color} style={styles.glyph} />

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {record.name}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {record.message || '(no message)'}
        </Text>

        <View style={styles.badges}>
          <InfoBadge label={CRASH_KIND_LABELS[record.kind]} />
          {record.fromPreviousLaunch && <InfoBadge icon="history" label="Previous launch" />}
          {record.breadcrumbs?.length ? (
            <InfoBadge icon="timeline" label={`${record.breadcrumbs.length}`} />
          ) : null}
          <Text style={styles.time}>{formatCrashTime(record.timestamp).slice(11)}</Text>
        </View>
      </View>

      {/* An unread marker rather than a count: a crash is read once, and the badge on the tab
          already carries how many are waiting. */}
      {!record.seen && <View style={[styles.unseenDot, { backgroundColor: visual.color }]} />}
    </TouchableOpacity>
  );
}

export const CrashRow = memo(CrashRowComponent);

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  glyph: {
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  message: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  time: {
    marginLeft: 'auto',
    fontFamily: 'monospace',
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  unseenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
  },
}));
