import type { Palette } from '../../../core/constants/theme.const';

// Material's `push_pin` and `straighten`, the glyphs the app's user timing rows use. Drawn through
// the network sheet's `[data-icon]::before` mask, since an icon font glyph cannot cross.
const KIND_ICONS = {
  'push-pin':
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>',
  straighten:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z"/></svg>',
};

const kindIconRules = Object.entries(KIND_ICONS)
  .map(
    ([name, svg]) =>
      `[data-icon="${name}"]::before { --icon: url("data:image/svg+xml,${encodeURIComponent(svg)}"); }`
  )
  .join('\n');

/**
 * The Performance panel's own rules. The bar, its buttons, the section toggles and the folds come
 * from `NETWORK_PANEL_CSS`, so the two panels' chrome cannot drift apart. Takes the palette for the
 * two colours the page's variables do not carry.
 */
export function performancePanelCss(palette: Palette): string {
  return `
.axonpack-perf {
  --perf-error-surface: ${palette.errorSurface};
}
.axonpack-perf-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.axonpack-perf h3,
.axonpack-perf h4 {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.axonpack-perf h4 { margin-top: 10px; }
.axonpack-perf hr {
  width: 100%;
  margin: 0;
  border: 0;
  border-top: 1px solid var(--line);
}
.axonpack-perf-muted { color: var(--muted); }
.axonpack-perf-note {
  margin: 0;
  font-size: 11px;
  line-height: 15px;
  color: var(--muted);
}
.axonpack-perf-note[data-list] { padding: 7px 10px; }
.axonpack-perf-empty {
  margin: 0;
  padding: 14px;
  line-height: 17px;
  color: var(--muted);
}
.axonpack-perf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 8px;
  padding: 0 12px 12px;
}
.axonpack-perf-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
}
.axonpack-perf-card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.axonpack-perf-card-head > span { font-size: 10px; }
.axonpack-perf-value,
.axonpack-perf-plot-value,
.axonpack-perf-reading strong,
.axonpack-perf-row strong,
.axonpack-perf-meter,
.axonpack-perf-table td {
  font-variant-numeric: tabular-nums;
}
.axonpack-perf-value { font-size: 22px; }
.axonpack-perf-plot-value { font-size: 15px; }
.axonpack-perf-readings {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.axonpack-perf-reading {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
}
.axonpack-perf-reading strong { font-size: 15px; color: var(--muted); }
.axonpack-perf-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.axonpack-perf-plot-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
/* Tick column sized by its widest label, then the plot; the x axis sits under the plot only. */
.axonpack-perf-chart {
  display: grid;
  grid-template-columns: auto 1fr;
  row-gap: 3px;
}
.axonpack-perf-ticks {
  position: relative;
  height: 64px;
  padding-right: 6px;
}
.axonpack-perf-chart[data-short] .axonpack-perf-ticks,
.axonpack-perf-chart[data-short] .axonpack-perf-plot {
  height: 52px;
}
.axonpack-perf-tick,
.axonpack-perf-tick-sizer,
.axonpack-perf-x-axis {
  font-size: 9px;
  line-height: 12px;
  color: var(--muted);
  white-space: nowrap;
}
.axonpack-perf-tick-sizer { visibility: hidden; }
.axonpack-perf-tick {
  position: absolute;
  right: 6px;
  transform: translateY(-50%);
}
.axonpack-perf-tick:nth-child(2) { top: 0; }
.axonpack-perf-tick:nth-child(3) { top: 50%; }
.axonpack-perf-tick:nth-child(4) { top: 100%; }
.axonpack-perf-plot {
  display: block;
  width: 100%;
  height: 64px;
  min-width: 0;
}
.axonpack-perf-x-axis {
  display: flex;
  justify-content: space-between;
}
.axonpack-perf-meter {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.axonpack-perf-meter-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.axonpack-perf-meter-row.axonpack-perf-muted { font-size: 11px; }
.axonpack-perf-meter-track {
  height: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--pop);
}
.axonpack-perf-meter-track > div {
  height: 100%;
  border-radius: 4px;
  background: var(--link);
}
.axonpack-perf-startup {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 10px 8px;
}
.axonpack-perf-startup .axonpack-perf-note { margin-top: 4px; }
.axonpack-perf-row {
  display: flex;
  justify-content: space-between;
}
.axonpack-perf-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 360px;
  margin: 0 auto;
  padding: 36px 24px 24px;
  text-align: center;
}
.axonpack-perf-idle > p { margin: 0; line-height: 18px; }
.axonpack-perf-idle h3 {
  font-size: 16px;
  letter-spacing: 0;
  text-transform: none;
  color: var(--fg);
}
.axonpack-perf-idle-badge {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--perf-error-surface);
}
.axonpack-perf-idle-badge::before {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--net-red);
}
.axonpack-perf-idle ul {
  align-self: stretch;
  margin: 6px 0 0;
  padding-left: 16px;
  text-align: left;
  line-height: 17px;
  color: var(--muted);
}
.axonpack-perf-start {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 7px 16px;
  border: 0;
  border-radius: 8px;
  background: var(--link);
  color: var(--bg);
  font: 700 13px system-ui, sans-serif;
}
.axonpack-perf-start::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}
.axonpack-perf-table {
  width: 100%;
  border-collapse: collapse;
}
.axonpack-perf-table td {
  padding: 7px 4px;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}
.axonpack-perf-table td:first-child { width: 1px; padding-left: 10px; }
.axonpack-perf-table td:last-child { padding-right: 10px; text-align: right; font-weight: 700; }
.axonpack-perf-table td[data-name] {
  width: 100%;
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.axonpack-perf-table td[data-muted] { font-size: 11px; color: var(--muted); }
.axonpack-perf-table td[data-muted][title] {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
${kindIconRules}
.axonpack-perf-kind {
  display: flex;
  color: var(--muted);
}
.axonpack-perf-kind::before { width: 13px; height: 13px; }
.axonpack-perf-marker {
  display: block;
  width: 3px;
  height: 16px;
  border-radius: 2px;
}
`;
}
