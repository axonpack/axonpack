import { STORAGE_ICONS } from './storage-icons.const';

/**
 * What the Storage panel needs on top of the Network panel's CSS, which it wraps itself in for the
 * toolbar, the table and the pane. Only rules Network has no class for.
 */
export const STORAGE_PANEL_CSS = `
.axonpack-sto mark {
  background: color-mix(in srgb, var(--net-pending) 45%, transparent);
  color: inherit;
}
.axonpack-sto-summary {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--line);
}
.axonpack-sto-summary-line { display: flex; align-items: center; gap: 6px; }
.axonpack-sto-summary-line strong { font-weight: 600; }
.axonpack-sto-muted { color: var(--muted); }
.axonpack-sto-note { margin: 0; color: var(--muted); font-size: 11px; }
.axonpack-sto-note[data-tone="warning"] { color: var(--net-pending); }
.axonpack-sto [data-tone="error"]:not(button) { color: var(--net-red); }
.axonpack-sto-text-button {
  height: 20px;
  margin: 0 3px;
  padding: 0 6px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--net-icon);
  font: inherit;
}
.axonpack-sto-text-button:hover { background: var(--hover); color: var(--fg); }
.axonpack-sto-text-button:has(.axonpack-material) { display: inline-flex; align-items: center; gap: 3px; }
.axonpack-sto-text-button .axonpack-material { width: 14px; height: 14px; }
${Object.entries(STORAGE_ICONS)
  .map(
    ([name, svg]) =>
      `.axonpack-sto [data-material="${name}"] { --icon: url("data:image/svg+xml,${encodeURIComponent(svg)}"); }`
  )
  .join('\n')}
/* The app's type glyph before a key, and on a type filter button. */
.axonpack-sto-kind-icon { width: 13px; height: 13px; margin-right: 4px; vertical-align: -2px; }
.axonpack-net-type .axonpack-sto-kind-icon { width: 12px; height: 12px; }
/* The store on screen reads as the heading it replaced. */
.axonpack-sto-store select,
.axonpack-sto-store-name { font-weight: 700; color: var(--fg); }
.axonpack-sto-store option { font-weight: 400; }
.axonpack-sto-store option:checked { font-weight: 700; }
.axonpack-sto-store-name { padding: 0 6px; }
.axonpack-sto-read { margin-left: 6px; color: var(--muted); white-space: nowrap; }
.axonpack-sto-value { font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
.axonpack-sto-kind { font-size: 10px; font-weight: 700; text-transform: uppercase; }
.axonpack-sto-key {
  padding: 8px 12px 0;
  font-weight: 700;
  overflow-wrap: anywhere;
  user-select: text;
}
.axonpack-sto-search { display: flex; flex-direction: column; gap: 4px; padding: 6px 12px; }
.axonpack-sto-search .axonpack-net-filter { max-width: none; margin: 0; }
.axonpack-sto-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 4px 12px 0;
  color: var(--muted);
}
.axonpack-sto-confirm {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--net-red) 12%, transparent);
}
.axonpack-sto-confirm > span { flex: 1; overflow-wrap: anywhere; }
.axonpack-sto-choices { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.axonpack-sto-choices .axonpack-net-type { margin: 0; }
.axonpack-sto-label { color: var(--muted); font-size: 11px; }
/* In-place editing, and the changes waiting for Sync. */
.axonpack-net-row > span.axonpack-sto-editing,
.axonpack-sto-new > span { padding: 0 1px; }
.axonpack-sto-cell-input {
  box-sizing: border-box;
  width: 100%;
  height: 19px;
  padding: 0 3px;
  border: 1px solid var(--line);
  border-radius: 2px;
  outline: 0;
  background: var(--bg);
  color: var(--fg);
  font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.axonpack-sto-cell-input:focus { border-color: var(--link); }
.axonpack-sto-cell-input[aria-invalid] { border-color: var(--net-red); }
.axonpack-sto-cell-input::placeholder { color: var(--muted); }
.axonpack-sto-value[title="Double-click to edit"] { cursor: text; }
.axonpack-net-grid .axonpack-net-row[data-dirty] > .axonpack-sto-value,
.axonpack-net-grid .axonpack-net-row[data-pending] {
  background: color-mix(in srgb, var(--net-pending) 18%, transparent);
}
.axonpack-net-row[data-error] > span:first-child { box-shadow: inset 2px 0 var(--net-red); }
.axonpack-sto-row-button {
  padding: 0 4px;
  border: 0;
  background: none;
  color: var(--link);
  font: inherit;
}
.axonpack-sto-row-button:disabled { color: var(--muted); opacity: 0.6; }
.axonpack-net-bar .axonpack-net-action { margin: 0 3px; padding: 1px 10px; }
`;
