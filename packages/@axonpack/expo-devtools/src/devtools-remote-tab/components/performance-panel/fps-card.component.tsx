import { LineChart, type ChartSeries } from './line-chart.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import { isUiFpsAvailable } from '../../../features/performance/services/fps-monitor.service';
import {
  performanceStore,
  usePerformanceStore,
} from '../../../features/performance/stores/performance.store';
import { ageAxisLabels } from '../../../features/performance/utils/age-labels.util';

// The same scale as the device's card, so the two charts line up.
const MIN_DOMAIN_MAX = 60;
const HEADROOM = 5;

export function FpsCard() {
  const palette = useThemeStore(themeStore.getPalette);
  const fps = usePerformanceStore(performanceStore.getFps);
  const uiFps = usePerformanceStore(performanceStore.getUiFps);
  const jsSeries = usePerformanceStore(performanceStore.getFpsSeries);
  const uiSeries = usePerformanceStore(performanceStore.getUiFpsSeries);
  const peak = usePerformanceStore(performanceStore.getFpsPeak);
  const nativeAvailable = isUiFpsAvailable();

  const series: ChartSeries[] = [
    { label: 'JS thread', values: jsSeries, color: palette.accent },
    ...(nativeAvailable && uiSeries.length > 1
      ? [{ label: 'Main thread', values: uiSeries, color: palette.keyAccent }]
      : []),
  ];
  const readings = [
    { label: 'JS thread', value: fps, color: palette.accent, available: true },
    { label: 'Main thread', value: uiFps, color: palette.keyAccent, available: nativeAvailable },
  ];

  return (
    <section className="axonpack-perf-card" data-wide>
      <header className="axonpack-perf-card-head">
        <h3>Frames per second</h3>
        <span className="axonpack-perf-muted">last 5 min</span>
      </header>

      <div className="axonpack-perf-readings">
        {readings.map(({ label, value, color, available }) => (
          <span key={label} className="axonpack-perf-reading">
            <span className="axonpack-perf-dot" style={{ background: color }} />
            <span className="axonpack-perf-muted">{label}</span>
            <strong style={available && value !== undefined ? { color } : undefined}>
              {available ? (value ?? '–') : 'dev build'}
            </strong>
          </span>
        ))}
      </div>

      {series.some((line) => line.values.length > 1) ? (
        <LineChart
          series={series}
          domainMax={Math.max(MIN_DOMAIN_MAX, peak) + HEADROOM}
          capacity={performanceStore.getFpsBucketCount()}
          gridColor={palette.border}
          xLabels={ageAxisLabels(
            performanceStore.getFpsBucketCount(),
            performanceStore.getFpsBucketMs()
          )}
        />
      ) : (
        <p className="axonpack-perf-note">Collecting. The chart fills in as frames are counted.</p>
      )}
    </section>
  );
}
