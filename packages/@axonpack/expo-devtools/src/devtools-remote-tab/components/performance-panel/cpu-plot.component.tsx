import { LineChart } from './line-chart.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import {
  performanceStore,
  usePerformanceStore,
} from '../../../features/performance/stores/performance.store';
import { ageAxisLabels } from '../../../features/performance/utils/age-labels.util';
import {
  CPU_DOMAIN_MAX,
  coreCountLabel,
  cpuLines,
} from '../../../features/performance/utils/cpu-lines.util';
import {
  formatCpuReading,
  formatPercent,
} from '../../../features/performance/utils/format-metrics.util';

export function CpuPlot() {
  const palette = useThemeStore(themeStore.getPalette);
  const { cpu, support } = usePerformanceStore(performanceStore.getSnapshot);
  const intervalMs = usePerformanceStore(performanceStore.getSampleIntervalMs);
  const capacity = usePerformanceStore(performanceStore.getHistorySize);

  const lines = cpuLines(cpu, palette);
  const cores = coreCountLabel(cpu);
  const sampled = cpu.length > 0;
  const plotted = support.cpu && lines.some((line) => line.values.length > 1);

  return (
    <div className="axonpack-perf-plot-block">
      <div className="axonpack-perf-card-head">
        <strong>CPU usage (this app)</strong>
        {cores ? <span className="axonpack-perf-muted">{cores}</span> : null}
      </div>

      {support.cpu && (
        <div className="axonpack-perf-readings">
          {lines.map((line) => (
            <span key={line.label} className="axonpack-perf-reading">
              <span className="axonpack-perf-dot" style={{ background: line.color }} />
              <span className="axonpack-perf-muted">{line.label}:</span>
              <strong style={line.latest !== undefined ? { color: line.color } : undefined}>
                {formatCpuReading(sampled, line.latest)}
              </strong>
            </span>
          ))}
        </div>
      )}

      {plotted ? (
        <LineChart
          series={lines.filter((line) => line.values.length > 1)}
          domainMax={CPU_DOMAIN_MAX}
          capacity={capacity}
          gridColor={palette.border}
          xLabels={ageAxisLabels(capacity, intervalMs)}
          formatTick={(value) => formatPercent(value)}
          short
        />
      ) : (
        <p className="axonpack-perf-note">
          {support.cpu ? 'Waiting for the first sample' : 'CPU usage needs a development build'}
        </p>
      )}
    </div>
  );
}
