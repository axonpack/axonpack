import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import type { StartupTiming } from '../../stores/performance/performance.store';
import { diffMs, formatMs } from '../../utils/performance/format-metrics.util';
import { CollapsibleSection } from '../ui/collapsible-section.ui';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function StartupTimingSection({ startup }: { startup?: StartupTiming }) {
  const hasAnyMarker =
    startup !== undefined &&
    (startup.startTime !== undefined ||
      startup.endTime !== undefined ||
      startup.initializeRuntimeStart !== undefined ||
      startup.executeJavaScriptBundleEntryPointStart !== undefined);

  if (!hasAnyMarker) return null;

  return (
    <CollapsibleSection title="Startup">
      <View style={styles.body}>
        <Row label="Total" value={formatMs(diffMs(startup.startTime, startup.endTime))} />
        <Row
          label="Native init"
          value={formatMs(diffMs(startup.startTime, startup.initializeRuntimeStart))}
        />
        <Row
          label="Runtime setup"
          value={formatMs(
            diffMs(startup.initializeRuntimeStart, startup.executeJavaScriptBundleEntryPointStart)
          )}
        />
        <Row
          label="Bundle eval"
          value={formatMs(diffMs(startup.executeJavaScriptBundleEntryPointStart, startup.endTime))}
        />
        {/* Every field is nullable — the platform only fills them in if its native code reports
              them, so a dash means "not reported", not "zero". */}
        <Text style={styles.note}>
          Measured once at launch. A dash means the platform did not report that marker.
        </Text>
      </View>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 4,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
});
