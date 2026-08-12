import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { isUiFpsAvailable } from '../../services/performance/fps-monitor.service';
import { performanceStore } from '../../stores/performance/performance.store';
import { ageAxisLabels } from '../../utils/performance/age-labels.util';
import { LineChart, type LineSeries } from '../ui/line-chart.ui';

/**
 * A floor for the scale, so a run that never cleared 30fps still draws in the lower half where it
 * belongs rather than filling the chart and looking flawless.
 */
const MIN_DOMAIN_MAX = 60;
/** Breathing room above the peak, so the highest point doesn't sit flush against the top edge. */
const HEADROOM = 5;

/**
 * Both frame rates on one chart, which is the point: they share a unit and a scale, so putting them
 * together is legitimate — and the gap between them is the reading that matters. A healthy JS line above a
 * collapsed native line is an app that feels frozen while every JS metric says it is fine.
 *
 * Colours were checked with the palette validator rather than chosen by eye: accent against key-accent
 * separates by ΔE 30 under protanopia, well clear of the floor. Identity is still not left to colour —
 * each series carries a direct label.
 */
export function FpsChartCard() {
  const fps = useSyncExternalStore(performanceStore.subscribe, performanceStore.getFps);
  const uiFps = useSyncExternalStore(performanceStore.subscribe, performanceStore.getUiFps);
  // Bucketed by the store, so a point keeps its value while it is on screen and the plot scrolls.
  const jsSeries = useSyncExternalStore(performanceStore.subscribe, performanceStore.getFpsSeries);
  const uiSeries = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getUiFpsSeries
  );

  const peak = useSyncExternalStore(performanceStore.subscribe, performanceStore.getFpsPeak);
  const nativeAvailable = isUiFpsAvailable();

  // Built from the session peak, not the visible window, so the axis rises once for a 120Hz device and
  // then holds still. A scale that also fell would repaint every line on every sample.
  // Headroom is added after the floor, not inside it. With it inside, an unconfirmed peak of 0 gave
  // max(60, 5) = 60, so a steady 60fps line sat flush against the top edge.
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
          // From the samples held, not the buffer's capacity: early on the chart covers seconds, not
          // minutes, and a fixed "5m ago" would overstate what is plotted.
          // The window the plot is scaled for, not the samples held: the left edge is a fixed point in
          // time now, and a partly filled buffer leaves that side empty rather than stretching into it.
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

/**
 * A dot plus a name beside every value: the legend and the direct label are the same element, so identity
 * never rests on the line colour alone.
 *
 * All three — dot, number, line — wear the one series colour. Grading the number by health instead put a
 * reading in a hue its own line never uses, and the amber of a 30–49fps warning is within a shade of the
 * main-thread series, so a slow JS figure read as if it belonged to the other line. Health is legible
 * from the plot against its axis; which series a number belongs to is not recoverable any other way.
 */
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
  const hasReading = available && value !== undefined;

  return (
    <View style={styles.reading}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.readingLabel}>{label}</Text>
      {/* An absent reading stays muted — it isn't a measurement, so it doesn't claim a series colour. */}
      <Text style={[styles.readingValue, { color: hasReading ? color : COLORS.textSecondary }]}>
        {available ? (value !== undefined ? value : '–') : 'dev build'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Spans the grid rather than sharing a row: a chart squeezed to half width stops being readable.
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
});
