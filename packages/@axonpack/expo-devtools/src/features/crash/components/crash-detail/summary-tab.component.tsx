import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { DeviceSection } from './device-section.component';
import { useCrashDetailStyles } from './shared.styles';
import { StackSection } from './stack-section.component';
import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';
import { getCrashKindVisual } from '../../constants/crash-kind-visuals.const';
import type { CrashRecord } from '../../stores/crash.store';
import { CRASH_KIND_LABELS, formatCrashTime } from '../../utils/format-crash-report.util';

export function SummaryTab({ record }: { record: CrashRecord }) {
  const styles = useStyles();
  const detailStyles = useCrashDetailStyles();
  const COLORS = useThemeColors();

  const visual = getCrashKindVisual(record.kind, COLORS);

  return (
    <View>
      <View style={[detailStyles.section, styles.overview]}>
        <View style={[styles.banner, { borderLeftColor: visual.color }]}>
          <MaterialIcons name={visual.icon} size={18} color={visual.color} />
          <View style={styles.bannerBody}>
            <Text style={[styles.bannerKind, { color: visual.color }]}>
              {CRASH_KIND_LABELS[record.kind]}
            </Text>
            <Text style={styles.bannerName} selectable>
              {record.name}
            </Text>
          </View>
        </View>

        <Text style={styles.message} selectable>
          {record.message || '(no message)'}
        </Text>

        <View style={detailStyles.infoRow}>
          <Text style={detailStyles.infoLabel}>Captured</Text>
          <Text style={detailStyles.infoValue} selectable>
            {formatCrashTime(record.timestamp)}
          </Text>
        </View>

        {record.fromPreviousLaunch && (
          <Text style={detailStyles.note}>
            Recorded during an earlier run of the app and read back at launch — the process did not
            survive it.
          </Text>
        )}

        {record.native?.type !== undefined && (
          <View style={detailStyles.infoRow}>
            <Text style={detailStyles.infoLabel}>Exception</Text>
            <Text style={detailStyles.infoValue} selectable>
              {record.native.type}
            </Text>
          </View>
        )}

        {record.native?.thread !== undefined && (
          <View style={detailStyles.infoRow}>
            <Text style={detailStyles.infoLabel}>Thread</Text>
            <Text style={detailStyles.infoValue} selectable>
              {record.native.thread}
            </Text>
          </View>
        )}

        {record.context !== undefined &&
          Object.entries(record.context).map(([key, value]) => (
            <View key={key} style={detailStyles.infoRow}>
              <Text style={detailStyles.infoLabel}>{key}</Text>
              <Text style={detailStyles.infoValue} selectable>
                {stringify(value)}
              </Text>
            </View>
          ))}
      </View>

      <StackSection record={record} />
      <DeviceSection record={record} />
    </View>
  );
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

const useStyles = makeThemedStyles((COLORS) => ({
  overview: {
    paddingBottom: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderRadius: 6,
    backgroundColor: COLORS.errorSurface,
  },
  bannerBody: {
    flex: 1,
    gap: 1,
  },
  bannerKind: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  message: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textPrimary,
  },
}));
