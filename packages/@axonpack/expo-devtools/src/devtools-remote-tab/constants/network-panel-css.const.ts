import { CHROME_ICONS } from './chrome-icons.const';

const iconRules = Object.entries(CHROME_ICONS)
  .map(
    ([name, svg]) =>
      `[data-icon="${name}"]::before { --icon: url("data:image/svg+xml,${encodeURIComponent(svg)}"); }`
  )
  .join('\n');

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
.axonpack-net-body {
  flex: 1;
  min-height: 0;
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
`;
