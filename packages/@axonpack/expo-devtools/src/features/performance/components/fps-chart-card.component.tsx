import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isUiFpsAvailable } from '../services/fps-monitor.service';
import { performanceStore } from '../stores/performance.store';
import { ageAxisLabels } from '../utils/age-labels.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { LineChart, type LineSeries } from '../../../core/components/ui/line-chart.ui';

const MIN_DOMAIN_MAX = 60;

const HEADROOM = 5;

export function FpsChartCard() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const fps = useSyncExternalStore(performanceStore.subscribe, performanceStore.getFps);
  const uiFps = useSyncExternalStore(performanceStore.subscribe, performanceStore.getUiFps);

  const jsSeries = useSyncExternalStore(performanceStore.subscribe, performanceStore.getFpsSeries);
  const uiSeries = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getUiFpsSeries
  );

  const peak = useSyncExternalStore(performanceStore.subscribe, performanceStore.getFpsPeak);
  const nativeAvailable = isUiFpsAvailable();

  const domainMax = Math.max(MIN_DOMAIN_MAX, peak) + HEADROOM;

  const series: LineSeries[] = [
    { label: 'JS thread', values: jsSeries, color: COLORS.accent },
    ...(nativeAvailable && uiSeries.length > 1
      ? [{ label: 'Main thread', values: uiSeries, color: COLORS.keyAccent }]
      : []),
  ];

  const hasPlot = series.some((line) => line.values.length > 1);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Frames per second</Text>
        <Text style={styles.window}>last 5 min</Text>
      </View>

      <View style={styles.readings}>
        <Reading label="JS thread" value={fps} color={COLORS.accent} available />
        <Reading
          label="Main thread"
          value={uiFps}
          color={COLORS.keyAccent}
          available={nativeAvailable}
        />
      </View>

      {hasPlot ? (
        <LineChart
          series={series}
          domainMax={domainMax}
          pointCapacity={performanceStore.getFpsBucketCount()}

          xLabels={ageAxisLabels(
            performanceStore.getFpsBucketCount(),
            performanceStore.getFpsBucketMs()
          )}
        />
      ) : (
        <Text style={styles.empty}>Collecting — the chart fills in as frames are counted.</Text>
      )}
    </View>
  );
}

function Reading({
  label,
  value,
  color,
  available,
}: {
  label: string;
  value?: number;
  color: string;
  available: boolean;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const hasReading = available && value !== undefined;

  return (
    <View style={styles.reading}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.readingLabel}>{label}</Text>
      {}
      <Text style={[styles.readingValue, { color: hasReading ? color : COLORS.textSecondary }]}>
        {available ? (value !== undefined ? value : '–') : 'dev build'}
      </Text>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  card: {
    width: '100%',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  window: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  readings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readingLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  readingValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
}));
