export type ChartSeries = { label: string; values: number[]; color: string };

/** The plot's own coordinates. CSS stretches the image to the card, so these never need a width. */
const VIEW = 100;
/** Kept off the edges, so the top and bottom gridlines are not half clipped by the image. */
const INSET = 1;

/**
 * Newest value at the right edge, spaced as if the series were full, so a short series grows in from
 * the right the way the device's chart does rather than stretching across the whole width.
 */
export function chartPoints(values: number[], domainMax: number, capacity: number): string {
  const step = VIEW / (Math.max(2, capacity) - 1);
  return values
    .map((value, index) => {
      const x = VIEW - (values.length - 1 - index) * step;
      const fraction = Math.min(1, Math.max(0, value / domainMax));
      const y = INSET + (1 - fraction) * (VIEW - 2 * INSET);
      return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
    })
    .join(' ');
}

// SVG cannot cross to the tab page, which builds nodes with `createElement`, but an image can.
function chartSvg(series: ChartSeries[], domainMax: number, capacity: number, grid: string) {
  const gridlines = [INSET, VIEW / 2, VIEW - INSET]
    .map(
      (y) =>
        `<line x1='0' x2='${VIEW}' y1='${y}' y2='${y}' stroke='${grid}' stroke-width='1' vector-effect='non-scaling-stroke'/>`
    )
    .join('');
  const lines = series
    .filter((line) => line.values.length > 1)
    .map(
      (line) =>
        `<polyline fill='none' stroke='${line.color}' stroke-width='2' stroke-linejoin='round' stroke-linecap='round' vector-effect='non-scaling-stroke' points='${chartPoints(line.values, domainMax, capacity)}'/>`
    )
    .join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${VIEW} ${VIEW}' preserveAspectRatio='none'>${gridlines}${lines}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function LineChart({
  series,
  domainMax,
  capacity,
  gridColor,
  xLabels,
  formatTick = (value) => String(Math.round(value)),
  short,
}: {
  series: ChartSeries[];
  domainMax: number;
  capacity: number;
  gridColor: string;
  xLabels: string[];
  formatTick?: (value: number) => string;
  short?: boolean;
}) {
  const ticks = [domainMax, domainMax / 2, 0].map(formatTick);
  const widest = ticks.reduce((wide, tick) => (tick.length > wide.length ? tick : wide), '');

  return (
    <div className="axonpack-perf-chart" data-short={short || undefined}>
      <div className="axonpack-perf-ticks">
        {/* The labels are placed on their gridlines, so they cannot size the column. This copy does. */}
        <span className="axonpack-perf-tick-sizer">{widest}</span>
        {ticks.map((tick, index) => (
          <span key={index} className="axonpack-perf-tick">
            {tick}
          </span>
        ))}
      </div>
      <img
        className="axonpack-perf-plot"
        src={chartSvg(series, domainMax, capacity, gridColor)}
        alt=""
      />
      <span />
      <div className="axonpack-perf-x-axis">
        {xLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
