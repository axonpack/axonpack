import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { performanceStore } from '../stores/performance.store';
import { formatSize } from '../../../core/utils/format-bytes.util';
import { ageAxisLabels } from '../utils/age-labels.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { LineChart } from '../../../core/components/ui/line-chart.ui';
import { UsageMeter } from '../../../core/components/ui/usage-meter.ui';

const PLOT_HEIGHT = 52;

const HEADROOM_FRACTION = 1.1;

export function MemoryChartCard() {
  const styles = useStyles();
  const { memory, systemMemory, support } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );
  const heapPeak = useSyncExternalStore(performanceStore.subscribe, performanceStore.getHeapPeak);
  const appPeak = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getAppMemoryPeak
  );
  const intervalMs = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSampleIntervalMs
  );
  const capacity = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getHistorySize
  );

  const heapSeries = memory
    .map((sample) => sample.usedJSHeapSize)
    .filter((value): value is number => value !== undefined);
  const appSeries = systemMemory
    .map((sample) => sample.appBytes)
    .filter((value): value is number => value !== undefined);

  const totalDeviceMemory = systemMemory.at(-1)?.totalBytes;
  const availableDeviceMemory = systemMemory.at(-1)?.availableToAppBytes;
  const usedDeviceMemory =
    totalDeviceMemory !== undefined && availableDeviceMemory !== undefined
      ? totalDeviceMemory - availableDeviceMemory
      : undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Memory</Text>

      <Plot
        title="JS Heap"
        latest={memory.at(-1)?.usedJSHeapSize}
        caption={
          !support.memory
            ? "This JS engine doesn't report it"
            : memory.at(-1)?.totalJSHeapSize !== undefined
              ? `of ${formatSize(memory.at(-1)?.totalJSHeapSize)} allocated`
              : 'Waiting for the first sample'
        }
        values={heapSeries}
        peak={heapPeak}
        capacity={capacity}
        xLabels={ageAxisLabels(capacity, intervalMs)}
      />

      <View style={styles.divider} />

      <Plot
        title="App memory"
        latest={systemMemory.at(-1)?.appBytes}
        caption={
          !support.systemMemory
            ? 'Needs a dev build'
            : appSeries.length === 0
              ? 'Waiting for the first sample'
              : undefined
        }
        values={appSeries}
        peak={appPeak}
        capacity={capacity}
        xLabels={ageAxisLabels(capacity, intervalMs)}
      />

      {support.systemMemory && (
        <>
          <View style={styles.divider} />

          <UsageMeter
            label="Device memory"
            usedBytes={usedDeviceMemory}
            totalBytes={totalDeviceMemory}
            caption={
              availableDeviceMemory !== undefined
                ? `${formatSize(availableDeviceMemory)} available to this app`
                : undefined
            }
          />
        </>
      )}
    </View>
  );
}

function Plot({
  title,
  latest,
  caption,
  values,
  peak,
  capacity,
  xLabels,
}: {
  title: string;
  latest?: number;
  caption?: string;
  values: number[];
  peak: number;
  capacity: number;
  xLabels: string[];
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  return (
    <View style={styles.plotBlock}>
      <View style={styles.headerRow}>
        <Text style={styles.plotTitle}>{title}</Text>
        <Text style={styles.plotValue}>{formatSize(latest)}</Text>
      </View>

      {values.length > 1 ? (
        <LineChart
          series={[{ label: title, values, color: COLORS.accent }]}
          domainMax={Math.max(1, peak * HEADROOM_FRACTION)}
          height={PLOT_HEIGHT}
          pointCapacity={capacity}
          xLabels={xLabels}
          formatTick={(value) => formatSize(Math.round(value))}
        />
      ) : (
        <Text style={styles.caption}>{caption ?? 'Collecting…'}</Text>
      )}

      {values.length > 1 && caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  card: {
    width: '100%',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  plotBlock: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  plotTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  plotValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  caption: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
}));
