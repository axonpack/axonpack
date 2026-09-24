import { LineChart } from './line-chart.component';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import { formatSize } from '../../../core/utils/format-bytes.util';

const HEADROOM_FRACTION = 1.1;

export function MemoryPlot({
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
  const palette = useThemeStore(themeStore.getPalette);
  const plotted = values.length > 1;

  return (
    <div className="axonpack-perf-plot-block">
      <div className="axonpack-perf-card-head">
        <strong>{title}</strong>
        <strong className="axonpack-perf-plot-value">{formatSize(latest)}</strong>
      </div>
      {plotted ? (
        <LineChart
          series={[{ label: title, values, color: palette.accent }]}
          domainMax={Math.max(1, peak * HEADROOM_FRACTION)}
          capacity={capacity}
          gridColor={palette.border}
          xLabels={xLabels}
          formatTick={(value) => formatSize(Math.round(value))}
          short
        />
      ) : (
        <p className="axonpack-perf-note">{caption ?? 'Collecting…'}</p>
      )}
      {plotted && caption ? <p className="axonpack-perf-note">{caption}</p> : null}
    </div>
  );
}
