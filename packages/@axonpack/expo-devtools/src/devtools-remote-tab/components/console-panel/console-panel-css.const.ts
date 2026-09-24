import { CONSOLE_ICON_CSS } from '../../constants/console-icons.const';

/**
 * The Console panel, after Chrome's `consoleView.css`. It sits inside `.axonpack-net`, so the bar,
 * its buttons, the filter box and the type buttons are the Network panel's, theme included, and
 * only what a console has of its own is here.
 */
export const CONSOLE_PANEL_CSS = `
.axonpack-con {
  display: flex;
  flex-direction: column;
  height: 100%;
}
${CONSOLE_ICON_CSS}
.axonpack-con-count {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0 4px;
  color: var(--row-color);
  font-weight: 700;
}
.axonpack-con-filters .axonpack-net-types { flex-wrap: wrap; height: auto; }
.axonpack-con-filters .axonpack-net-type { display: inline-flex; align-items: center; gap: 3px; }
.axonpack-con-filters .axonpack-net-type[data-con-icon]::before { color: var(--row-color); }
.axonpack-con-main {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}
/*
  Reversed, so the browser keeps the view on the newest row while you are at the bottom and leaves
  it alone once you scroll up. The app never hears about scrolling, so it could not do this itself.
*/
.axonpack-con-list {
  flex: 1;
  min-width: 0;
  overflow: auto;
  display: flex;
  flex-direction: column-reverse;
  font: 11px ui-monospace, Menlo, Consolas, monospace;
}
.axonpack-con-row {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 3px 8px 3px 6px;
  border-bottom: 1px solid var(--line);
  background: var(--row-surface, transparent);
}
.axonpack-con-glyph {
  flex: none;
  display: inline-flex;
  width: 14px;
  height: 15px;
  align-items: center;
  color: var(--row-color);
}
.axonpack-con-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.axonpack-con-body[data-recall] { cursor: pointer; }
.axonpack-con-row:has(> .axonpack-con-body[data-recall]):hover { background: var(--hover); }
.axonpack-con-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--tone, inherit);
}
.axonpack-con-text[data-clamped] {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.axonpack-con-text mark {
  background: color-mix(in srgb, var(--net-pending) 45%, transparent);
  color: inherit;
}
.axonpack-con-link {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--link);
  font: 600 11px system-ui, sans-serif;
  cursor: pointer;
}
.axonpack-con-error {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  color: var(--net-red);
}
.axonpack-con-report {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.axonpack-con-report:hover { text-decoration: underline; }
.axonpack-con-card[data-open] { cursor: pointer; }
/* An overlay, not a background, so the crash's own tint stays under it. */
.axonpack-con-card[data-open]:hover { box-shadow: inset 0 0 0 100vmax var(--hover); }
.axonpack-con-open {
  align-self: flex-end;
  margin-top: 2px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--row-color);
  font: 600 11px system-ui, sans-serif;
  cursor: pointer;
}
.axonpack-con-open::after { content: " ›"; }
.axonpack-con-disclosure {
  flex: none;
  display: inline-flex;
  width: 14px;
  height: 15px;
  align-items: center;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
}
.axonpack-con-disclosure[aria-expanded="false"]::before { transform: rotate(-90deg); }
.axonpack-con-stack {
  margin: 2px 0 0 16px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--muted);
}
.axonpack-con .axonpack-json { padding: 0; }
.axonpack-con-meta {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 40%;
  color: var(--muted);
  font: 10px system-ui, sans-serif;
  white-space: nowrap;
}
.axonpack-con-meta > * { overflow: hidden; text-overflow: ellipsis; }
.axonpack-con-meta .axonpack-net-button { min-width: 18px; height: 16px; flex: none; }
.axonpack-con-meta .axonpack-net-button::before { width: 13px; height: 13px; }
.axonpack-con-card {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 4px 8px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--row-color);
  border-radius: 6px;
  background: var(--row-surface, transparent);
  font: 12px system-ui, sans-serif;
}
.axonpack-con-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.axonpack-con-card-name { flex: 1; font-weight: 700; }
.axonpack-con-card-message {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  color: var(--muted);
  font: 11px ui-monospace, Menlo, Consolas, monospace;
}
.axonpack-con-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}
.axonpack-con-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.axonpack-con-badges > time { margin-left: auto; }
.axonpack-con-empty {
  margin: auto;
  padding: 40px 0;
  color: var(--muted);
  font: 12px system-ui, sans-serif;
}
.axonpack-con-prompt {
  flex: none;
  border-top: 1px solid var(--line);
}
.axonpack-con-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px 6px 0;
}
.axonpack-con-prompt-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 0 4px 0 6px;
  color: var(--link);
}
.axonpack-con-prompt-row > span:not([class]) { flex: 1; display: flex; }
.axonpack-con-prompt-row input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: none;
  color: var(--fg);
  font: 11px ui-monospace, Menlo, Consolas, monospace;
}
`;
