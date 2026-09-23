import { CHROME_ICONS } from './chrome-icons.const';

const iconRules = Object.entries(CHROME_ICONS)
  .map(
    ([name, svg]) =>
      `[data-icon="${name}"]::before { --icon: url("data:image/svg+xml,${encodeURIComponent(svg)}"); }`
  )
  .join('\n');

/** A column drag's slices: this many pixels each, and this many either side of the line. */
export const RESIZE_SLICE = 4;
export const RESIZE_REACH = 100;

/** The slice under the pointer, as the distance the dragged line has moved. */
const dragRules = Array.from(
  { length: 2 * RESIZE_REACH },
  (_, slice) =>
    `.axonpack-net-grid:has(> .axonpack-net-resize-anchor > .axonpack-net-resize-slices > span:nth-child(${slice + 1}):hover) { --net-drag: ${(slice - RESIZE_REACH) * RESIZE_SLICE}px; }`
).join('\n');

/** The same, for the line between the table and the request pane. */
const splitDragRules = Array.from(
  { length: 2 * RESIZE_REACH },
  (_, slice) =>
    `.axonpack-net-main:has(> .axonpack-net-split-anchor > .axonpack-net-resize-slices > span:nth-child(${slice + 1}):hover) { --net-split-drag: ${(slice - RESIZE_REACH) * RESIZE_SLICE}px; }`
).join('\n');

/**
 * The Network panel's toolbar, filter bar and settings pane, sized and coloured after Chrome
 * DevTools' own `toolbar.css` and `filter.css` (the same frontend React Native DevTools is), so the
 * strip reads as the Network panel people already know.
 */
export const NETWORK_PANEL_CSS = `
.axonpack-net {
  --net-icon: #c7c7c7;
  --net-red: #e46962;
  --net-tonal: #004a77;
  --net-on-tonal: #dff3ff;
  --net-outline: #757575;
  --net-ov-total: #444746;
  --net-ov-waiting: rgb(55 190 95);
  --net-ov-receiving: rgb(76 141 246);
  --net-ov-window: color-mix(in srgb, rgb(124 172 248) 32%, transparent);
  --net-section: color-mix(in srgb, var(--fg) 6%, transparent);
  --net-success: rgb(55 190 95);
  --net-pending: #f9ab00;
  display: flex;
  flex-direction: column;
  height: 100%;
  font: 12px system-ui, sans-serif;
}
@media (prefers-color-scheme: light) {
  .axonpack-net {
    --net-icon: #474747;
    --net-red: #dc362e;
    --net-tonal: #d3e3fd;
    --net-on-tonal: #041e49;
    --net-outline: #c7c7c7;
    --net-ov-total: #e1e3e1;
    --net-ov-window: color-mix(in srgb, rgb(76 141 246) 32%, transparent);
  }
}
.axonpack-net-bar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-height: 26px;
  padding: 0 2px;
  border-bottom: 1px solid var(--line);
}
.axonpack-net-main {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}
.axonpack-net-body {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
.axonpack-net-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 26px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--net-icon);
}
.axonpack-net-button:hover { color: var(--fg); }
.axonpack-net-button[aria-pressed="true"] { color: var(--link); }
.axonpack-net-button[data-red] { color: var(--net-red); }
.axonpack-net-button[aria-disabled="true"] { opacity: 0.4; }
[data-icon]::before {
  content: "";
  width: 20px;
  height: 20px;
  background: currentColor;
  -webkit-mask: var(--icon) center / contain no-repeat;
  mask: var(--icon) center / contain no-repeat;
}
${iconRules}
.axonpack-net-divider {
  flex: none;
  width: 1px;
  height: 16px;
  margin: 5px 4px;
  background: var(--line);
}
.axonpack-net-spacer { flex: auto; }
.axonpack-net-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 7px 0 1px;
  white-space: nowrap;
  user-select: none;
}
.axonpack-net-checkbox input {
  width: 12px;
  height: 12px;
  margin: 0 0 0 4px;
  accent-color: var(--link);
}
.axonpack-net-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  margin: 0 3px;
  border-radius: 4px;
  color: var(--net-icon);
}
.axonpack-net-select:hover { background: var(--hover); }
.axonpack-net-select select {
  appearance: none;
  height: 20px;
  padding: 0 20px 0 8px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
}
.axonpack-net-select option { background: var(--pop); color: var(--fg); }
.axonpack-net-select::after {
  content: "";
  position: absolute;
  right: 2px;
  width: 16px;
  height: 16px;
  background: currentColor;
  -webkit-mask: var(--icon) center / contain no-repeat;
  mask: var(--icon) center / contain no-repeat;
  --icon: url("data:image/svg+xml,${encodeURIComponent(CHROME_ICONS['arrow-drop-down'])}");
  pointer-events: none;
}
.axonpack-net-filter {
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 140px;
  max-width: 300px;
  height: 20px;
  margin: 1px 3px;
  padding: 0 2px 0 4px;
  border-radius: 100px;
  background: var(--hover);
  color: var(--net-icon);
}
.axonpack-net-filter:focus-within { box-shadow: inset 0 0 0 2px var(--link); }
.axonpack-net-filter[data-invalid] { box-shadow: inset 0 0 0 1px var(--net-red); }
.axonpack-net-filter::before { width: 16px; height: 16px; flex: none; }
.axonpack-net-filter input,
.axonpack-net-field input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--fg);
  font: inherit;
}
.axonpack-net-filter .axonpack-net-button { min-width: 18px; height: 18px; }
.axonpack-net-filter .axonpack-net-button::before { width: 14px; height: 14px; }
.axonpack-net-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  margin: 0 4px 0 8px;
  padding: 0 0 0 4px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--net-icon);
  font: inherit;
  anchor-name: --axonpack-more-filters;
}
.axonpack-net-dropdown:hover { background: var(--hover); }
.axonpack-net-dropdown::before { order: 1; width: 16px; height: 16px; }
.axonpack-net-badge {
  padding: 0 5px;
  border-radius: 8px;
  background: var(--net-tonal);
  color: var(--net-on-tonal);
  font-size: 10px;
  font-weight: 700;
}
.axonpack-net-types {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 2px;
}
.axonpack-net-type {
  flex: none;
  margin: auto 2px;
  padding: 3px 6px;
  border: 0;
  border-radius: 6px;
  outline: 1px solid var(--net-outline);
  outline-offset: -1px;
  background: none;
  color: var(--fg);
  font: 500 11px system-ui, sans-serif;
}
.axonpack-net-type:hover { outline: none; background: var(--hover); }
.axonpack-net-type[aria-pressed="true"] {
  outline: none;
  background: var(--net-tonal);
  color: var(--net-on-tonal);
}
.axonpack-net-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 11;
  display: flex;
  flex-direction: column;
  min-width: 240px;
  max-height: 70vh;
  overflow: auto;
  padding: 4px 0;
  background: var(--pop);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: 0 2px 8px #0006;
}
@supports (anchor-name: --a) {
  .axonpack-net-menu {
    position: fixed;
    position-anchor: --axonpack-more-filters;
    top: anchor(bottom);
    left: anchor(left);
    position-try-fallbacks: flip-inline;
  }
}
.axonpack-net-menu .axonpack-net-checkbox { padding: 0 12px 0 8px; }
.axonpack-net-menu hr {
  width: 100%;
  margin: 4px 0;
  border: 0;
  border-top: 1px solid var(--line);
}
.axonpack-net-menu-label {
  padding: 4px 12px 2px;
  color: var(--muted);
  font-size: 11px;
}
.axonpack-net-field {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 12px;
  padding: 2px 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
}
.axonpack-net-field[data-invalid] { border-color: var(--net-red); }
.axonpack-net-settings {
  flex: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  padding: 2px 4px;
  border-bottom: 1px solid var(--line);
}
/* Chrome's overview: 60px tall, bars in 3px bands, labelled dividers along the top. */
.axonpack-net-overview {
  position: relative;
  flex: none;
  height: 60px;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
  user-select: none;
}
.axonpack-net-ov-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--line);
}
.axonpack-net-ov-tick span {
  position: absolute;
  top: 4px;
  right: 3px;
  color: var(--muted);
  font-size: 80%;
  white-space: nowrap;
}
.axonpack-net-ov-bar {
  position: absolute;
  height: 3px;
  min-width: 2px;
  box-sizing: border-box;
  display: flex;
  background: var(--net-ov-receiving);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--bg) 80%, transparent);
}
.axonpack-net-ov-bar[data-pending] { background: var(--net-ov-total); }
.axonpack-net-ov-wait {
  flex: none;
  height: 100%;
  background: var(--net-ov-waiting);
}
.axonpack-net-ov-curtain {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--net-ov-window);
  pointer-events: none;
}
.axonpack-net-ov-columns {
  position: absolute;
  inset: 0;
  display: flex;
  cursor: text;
}
.axonpack-net-ov-columns span { flex: 1; }
.axonpack-net-ov-drag { display: none; }
/*
  The window while it is being dragged, drawn in the page from the held column to the one under the
  pointer. \`min\` of the two insets on each side is whichever column is further out, so dragging
  back past where it started works too. Hidden when the pointer is over no column.
*/
@supports (anchor-name: --a) {
  .axonpack-net-ov-columns span[data-anchor] { anchor-name: --axonpack-ov-start; }
  .axonpack-net-overview[data-dragging] .axonpack-net-ov-columns span:hover {
    anchor-name: --axonpack-ov-pointer;
  }
  .axonpack-net-ov-drag {
    position: absolute;
    top: 0;
    bottom: 0;
    display: block;
    left: min(anchor(--axonpack-ov-start left), anchor(--axonpack-ov-pointer left));
    right: min(anchor(--axonpack-ov-start right), anchor(--axonpack-ov-pointer right));
    background: var(--net-ov-window);
    pointer-events: none;
    position-visibility: anchors-valid;
  }
}
.axonpack-net-ov-handle {
  position: absolute;
  top: 0;
  box-sizing: border-box;
  width: 10px;
  height: 19px;
  margin-left: -5px;
  border: 1px solid var(--net-outline);
  border-radius: 3px;
  background: var(--net-tonal);
  cursor: ew-resize;
}
.axonpack-net-ov-handle::before,
.axonpack-net-ov-handle::after {
  content: "";
  position: absolute;
  top: 5px;
  left: 2px;
  width: 1px;
  height: 7px;
  border-radius: 1px;
  background: var(--link);
}
.axonpack-net-ov-handle::after { left: 5px; }
/*
  Chrome's request table: 21px rows, 41px with big rows, hairlines between columns, every other row
  a shade off.

  One grid with every row a subgrid, so the widths the app sets on the grid hold for every row.
*/
.axonpack-net-grid {
  --net-row: 21px;
  position: relative;
  display: grid;
}
.axonpack-net-grid > div,
.axonpack-net-grid > p {
  grid-column: 1 / -1;
}
.axonpack-net-grid > div:not(.axonpack-net-row) {
  display: grid;
  grid-template-columns: subgrid;
}
.axonpack-net-grid[data-big] { --net-row: 41px; }
.axonpack-net-row {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  height: var(--net-row);
}
.axonpack-net-row > span {
  display: block;
  align-content: center;
  min-width: 0;
  padding: 0 4px;
  border-left: 1px solid var(--line);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.axonpack-net-row > span:first-child { border-left: 0; }
.axonpack-net-row:nth-child(even of .axonpack-net-row) {
  background: color-mix(in srgb, var(--fg) 4%, transparent);
}
.axonpack-net-row:not(.axonpack-net-head):hover { background: var(--hover); }
.axonpack-net-row[data-failed] { color: var(--net-red); }
.axonpack-net-sub {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--muted);
}
.axonpack-net-row[data-failed] .axonpack-net-sub { color: inherit; opacity: 0.8; }
.axonpack-net-head {
  position: sticky;
  top: 0;
  z-index: 1;
  height: 21px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  user-select: none;
}
.axonpack-net-head > span {
  display: flex;
  align-items: center;
  gap: 2px;
}
/*
  A grab strip over a column's right hairline, a few pixels either side of it. A positioned grid
  child with no row placement takes the whole grid's height inside its column, so the line can be
  grabbed on any row.
*/
.axonpack-net-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -4px;
  z-index: 2;
  width: 7px;
  cursor: col-resize;
}
/*
  Fixed, so the strip reaches the bottom of the panel without growing the scroll area, and left at
  its static position, which is the anchor. Each slice lights its left edge under the pointer, and
  that edge is the guide line.
*/
.axonpack-net-resize-slices {
  position: fixed;
  top: 0;
  bottom: 0;
  display: flex;
  cursor: col-resize;
}
/*
  The right edge of the column right of the dragged line, where the slices count from. Above every
  grip, or those would take the pointer from the slices.
*/
.axonpack-net-resize-anchor {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
}
.axonpack-net-resize-slices span { flex: none; width: ${RESIZE_SLICE}px; }
${dragRules}
.axonpack-net-resize-slices span:hover { box-shadow: inset 1px 0 var(--link); }
.axonpack-net-head > span[data-sortable]:hover { background: var(--hover); }
.axonpack-net-head [data-icon] { display: inline-flex; margin-left: auto; color: var(--net-icon); }
.axonpack-net-head [data-icon]::before { width: 14px; height: 14px; }
.axonpack-net-group {
  grid-column: 1 / -1;
  height: 21px;
  padding: 0 6px;
  line-height: 21px;
  background: var(--net-tonal);
  color: var(--net-on-tonal);
  font-weight: 500;
}
.axonpack-net-row > .axonpack-net-name {
  display: flex;
  align-items: center;
  gap: 4px;
}
.axonpack-net-name-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Chrome's icon grows with the row, 16px in a small one and 28px in a big one. */
.axonpack-net-file { display: inline-flex; flex: none; color: var(--net-icon); }
.axonpack-net-file::before { width: 16px; height: 16px; }
.axonpack-net-grid[data-big] .axonpack-net-file::before { width: 28px; height: 28px; }
.axonpack-net-file[data-tone="blue"] { color: var(--link); }
.axonpack-net-file[data-tone="green"] { color: rgb(55 190 95); }
.axonpack-net-file[data-tone="yellow"] { color: #e5a50a; }
.axonpack-net-file[data-tone="orange"] { color: #e8710a; }
.axonpack-net-file[data-tone="purple"] { color: #a142f4; }
.axonpack-net-file[data-tone="teal"] { color: #12b5cb; }
.axonpack-net-empty {
  margin: 0;
  padding: 24px 12px;
  color: var(--muted);
  text-align: center;
}
.axonpack-net-summary {
  gap: 4px;
  padding: 0 8px;
  border-top: 1px solid var(--line);
  border-bottom: 0;
  color: var(--muted);
  white-space: nowrap;
}
/* Chrome's selected row: the tonal fill, over the stripes and the hover. */
.axonpack-net-row[data-selected],
.axonpack-net-row[data-selected]:hover {
  background: var(--net-tonal);
  color: var(--net-on-tonal);
}
.axonpack-net-row[data-selected] .axonpack-net-sub { color: inherit; opacity: 0.8; }
.axonpack-net-detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--line);
}
.axonpack-net-detail-bar {
  flex: none;
  display: flex;
  align-items: stretch;
  height: 26px;
  border-bottom: 1px solid var(--line);
}
.axonpack-net-detail-close { height: auto; }
.axonpack-net-detail-close::before { width: 16px; height: 16px; }
.axonpack-net-detail-tab {
  position: relative;
  padding: 0 10px;
  border: 0;
  background: none;
  color: var(--muted);
  font: inherit;
  white-space: nowrap;
}
.axonpack-net-detail-tab:hover { background: var(--hover); color: var(--fg); }
.axonpack-net-detail-tab[aria-selected="true"] { color: var(--fg); }
.axonpack-net-detail-tab[aria-selected="true"]::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--link);
}
.axonpack-net-detail-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  user-select: text;
}
/*
  The app's section header: its own tint, with a hairline above and below. A header sits a pixel up
  over the one before it, so two closed sections share a line rather than drawing two.
*/
.axonpack-net-section > summary {
  margin-top: -1px;
  padding: 5px 8px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--net-section);
  font-weight: 700;
  cursor: default;
  user-select: none;
}
.axonpack-net-section:first-child > summary { margin-top: 0; border-top: 0; }
.axonpack-net-section[open] > summary { margin-bottom: 6px; }
.axonpack-net-section-tools {
  display: flex;
  justify-content: flex-end;
  padding: 0 12px;
}
.axonpack-net-section-tools button {
  padding: 2px 0;
  border: 0;
  background: none;
  color: var(--link);
  font: 600 12px system-ui, sans-serif;
}
/* The app's status dot, in the status's own colour. */
.axonpack-net-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  vertical-align: 0;
}
.axonpack-net-dot[data-tone="success"] { background: var(--net-success); }
.axonpack-net-dot[data-tone="pending"] { background: var(--net-pending); }
.axonpack-net-dot[data-tone="error"] { background: var(--net-red); }
.axonpack-net-count { margin-left: 4px; color: var(--muted); font-weight: 400; }
/* Key and value, the keys in a column of their own so the values line up, as in Chrome. */
.axonpack-net-kv {
  display: grid;
  grid-template-columns: minmax(100px, max-content) 1fr;
  gap: 2px 12px;
  padding: 0 12px 8px 22px;
}
.axonpack-net-kv > div { display: contents; }
.axonpack-net-kv span:first-child { color: var(--muted); font-weight: 500; }
.axonpack-net-kv span:last-child { min-width: 0; overflow-wrap: anywhere; }
.axonpack-net-code {
  margin: 0;
  padding: 6px 12px 10px;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.axonpack-net-none { margin: 0; padding: 8px 12px; color: var(--muted); }
/* Chrome's timing table: the phase, where it sat in the request, and how long it took. */
.axonpack-net-timing { padding-bottom: 8px; }
.axonpack-net-timing-row {
  display: grid;
  grid-template-columns: minmax(120px, 200px) 1fr 72px;
  align-items: center;
  gap: 12px;
  padding: 3px 12px;
}
.axonpack-net-timing-row > span:last-child { text-align: right; }
.axonpack-net-timing-track { position: relative; height: 12px; }
.axonpack-net-timing-track > span {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 1px;
  background: var(--muted);
}
.axonpack-net-timing-track > [data-phase="dnsMs"] { background: #009688; }
.axonpack-net-timing-track > [data-phase="tcpMs"] { background: #ff9800; }
.axonpack-net-timing-track > [data-phase="tlsMs"] { background: #9c27b0; }
.axonpack-net-timing-track > [data-phase="sendMs"],
.axonpack-net-timing-track > [data-phase="waitMs"] { background: var(--net-ov-waiting); }
.axonpack-net-timing-track > [data-phase="downloadMs"] { background: var(--net-ov-receiving); }
.axonpack-net-timing-total { border-top: 1px solid var(--line); margin-top: 4px; font-weight: 600; }
/* The pretty printer draws its own rows. This is only the room around them. */
.axonpack-json { padding: 4px 12px 10px; }
/* A menu under the row it was asked on. The anchor takes no room, so opening it moves nothing. */
.axonpack-net-context-anchor { position: relative; height: 0; }
.axonpack-net-context {
  position: absolute;
  top: 0;
  left: 16px;
  z-index: 11;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: 4px 0;
  background: var(--pop);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: 0 2px 8px #0006;
}
.axonpack-net-context-item {
  padding: 4px 12px;
  border: 0;
  background: none;
  color: var(--fg);
  font: 12px system-ui, sans-serif;
  text-align: left;
  white-space: nowrap;
}
.axonpack-net-context-item:hover { background: var(--hover); }
.axonpack-net-preview-image { padding: 12px; }
.axonpack-net-preview-image img { max-width: 100%; }
.axonpack-net-preview-page { width: 100%; height: 100%; border: 0; background: #fff; }
/* Chrome's cookie and EventStream tables. */
.axonpack-net-cookies {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.axonpack-net-cookies th,
.axonpack-net-cookies td {
  padding: 3px 6px;
  border: 1px solid var(--line);
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.axonpack-net-cookies th { font-weight: 500; background: var(--net-section); }
.axonpack-net-codeframe {
  margin: 8px 12px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--pop);
  font: 11px/15px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--muted);
  white-space: pre;
  overflow: auto;
}
.axonpack-net-codeframe-file { margin-bottom: 4px; font-family: system-ui, sans-serif; }
.axonpack-net-codeframe [data-marked] { color: var(--fg); font-weight: 600; }
.axonpack-net-stack { padding: 0 12px 8px 22px; }
.axonpack-net-stack > div { display: flex; gap: 12px; padding: 1px 0; }
.axonpack-net-stack > div > span:last-child {
  color: var(--link);
  font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-wrap: anywhere;
}
.axonpack-net-stack > [data-vendor] { opacity: 0.55; }
/*
  The line between the table and the request pane: a flex item with no width, so it sits exactly on
  the boundary, holding a grab strip a few pixels either side of it.
*/
.axonpack-net-split { position: relative; flex: none; width: 0; }
.axonpack-net-split > span {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  z-index: 3;
  width: 7px;
  cursor: col-resize;
}
/* The table's left edge, where the split's slices count from. Above every grip. */
.axonpack-net-split-anchor {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 4;
}
${splitDragRules}
`;
