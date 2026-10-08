import { Text, View } from 'react-native';

import { performanceStore, usePerformanceStore } from '../stores/performance.store';
import { ageAxisLabels } from '../utils/age-labels.util';
import { CPU_DOMAIN_MAX, coreCountLabel, cpuLines } from '../utils/cpu-lines.util';
import { formatCpuReading, formatPercent } from '../utils/format-metrics.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { LineChart } from '../../../core/components/ui/line-chart.ui';

const PLOT_HEIGHT = 52;

export function CpuPlot() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const { cpu, support } = usePerformanceStore(performanceStore.getSnapshot);
  const intervalMs = usePerformanceStore(performanceStore.getSampleIntervalMs);
  const capacity = usePerformanceStore(performanceStore.getHistorySize);

  const lines = cpuLines(cpu, COLORS);
  const cores = coreCountLabel(cpu);
  const sampled = cpu.length > 0;
  const plotted = support.cpu && lines.some((line) => line.values.length > 1);

  return (
    <View style={styles.block}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>CPU usage (this app)</Text>
        {cores ? <Text style={styles.cores}>{cores}</Text> : null}
      </View>

      {support.cpu && (
        <View style={styles.readings}>
          {lines.map((line) => (
            <View key={line.label} style={styles.reading}>
              <View style={[styles.dot, { backgroundColor: line.color }]} />
              <Text style={styles.readingLabel}>{line.label}:</Text>
              <Text
                style={[
                  styles.readingValue,
                  { color: line.latest !== undefined ? line.color : COLORS.textSecondary },
                ]}>
                {formatCpuReading(sampled, line.latest)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {plotted ? (
        <LineChart
          series={lines.filter((line) => line.values.length > 1)}
          domainMax={CPU_DOMAIN_MAX}
          height={PLOT_HEIGHT}
          pointCapacity={capacity}
          xLabels={ageAxisLabels(capacity, intervalMs)}
          formatTick={(value) => formatPercent(value)}
        />
      ) : (
        <Text style={styles.caption}>
          {support.cpu ? 'Waiting for the first sample' : 'CPU usage needs a development build'}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  block: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cores: {
    fontSize: 11,
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
  caption: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
}));
