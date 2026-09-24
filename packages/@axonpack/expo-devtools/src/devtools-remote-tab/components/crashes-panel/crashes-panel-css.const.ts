import { CONSOLE_ICON_CSS } from '../../constants/console-icons.const';

/**
 * The Crashes panel. It sits inside `.axonpack-net`, so its bar, filter box, detail pane, sections,
 * code frames and stack are the Network panel's classes, and only the rows and the report's own
 * pieces are here.
 */
export const CRASHES_PANEL_CSS = `
${CONSOLE_ICON_CSS}
.axonpack-crash-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin: 0 6px;
  color: var(--muted);
}
.axonpack-crash-count::before { color: var(--net-red); }
.axonpack-crash-filters .axonpack-net-types { flex-wrap: wrap; height: auto; }
.axonpack-crash-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  color: var(--fg);
  font: 12px system-ui, sans-serif;
  text-align: left;
  cursor: pointer;
}
.axonpack-crash-row:hover { background: var(--hover); }
.axonpack-crash-row[aria-selected="true"] { background: var(--net-tonal); color: var(--net-on-tonal); }
.axonpack-crash-glyph {
  flex: none;
  display: inline-flex;
  height: 16px;
  align-items: center;
  color: var(--row-color);
}
.axonpack-crash-glyph::before { width: 16px; height: 16px; }
.axonpack-crash-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.axonpack-crash-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.axonpack-crash-message {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--muted);
  font: 11px ui-monospace, Menlo, Consolas, monospace;
  white-space: pre-wrap;
}
.axonpack-crash-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}
.axonpack-crash-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.axonpack-crash-badge::before { width: 11px; height: 11px; }
.axonpack-crash-badges > time { margin-left: auto; font-family: ui-monospace, Menlo, monospace; }
.axonpack-crash-unread {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 4px;
  background: var(--row-color);
}
.axonpack-crash-empty {
  max-width: 420px;
  margin: 48px auto 0;
  padding: 0 24px;
  color: var(--muted);
  text-align: center;
}
.axonpack-crash-empty p:first-child { font-weight: 600; font-size: 13px; }
.axonpack-crash-title {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 8px 12px 4px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.axonpack-crash-title > span { flex: 1; }
.axonpack-crash-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 12px 8px;
  padding: 6px 10px;
  border-left: 3px solid var(--row-color);
  background: var(--net-section);
}
.axonpack-crash-banner::before { width: 18px; height: 18px; color: var(--row-color); }
.axonpack-crash-banner-kind { color: var(--row-color); font-size: 11px; font-weight: 700; }
.axonpack-crash-report-message {
  margin: 0 12px 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 12px ui-monospace, Menlo, Consolas, monospace;
}
.axonpack-crash-note { margin: 4px 12px 8px; color: var(--muted); font-size: 11px; }
.axonpack-crash-frames { overflow-x: auto; }
.axonpack-crash-frames .axonpack-net-stack > div { white-space: pre; cursor: pointer; }
.axonpack-crash-frames .axonpack-net-stack > div > span:first-child { color: var(--muted); min-width: 16px; }
.axonpack-crash-toggle {
  margin: 0 12px 8px 22px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--link);
  font: 600 11px system-ui, sans-serif;
  cursor: pointer;
}
.axonpack-crash-native {
  margin: 0;
  padding: 0 12px 8px 22px;
  overflow-x: auto;
  font: 11px ui-monospace, Menlo, Consolas, monospace;
}
.axonpack-crash-codeframes { display: flex; flex-direction: column; gap: 6px; }
.axonpack-crash-crumb {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 3px 12px;
  border-bottom: 1px solid var(--line);
  font: 11px ui-monospace, Menlo, Consolas, monospace;
}
.axonpack-crash-crumb::before { margin-top: 1px; color: var(--row-color); }
.axonpack-crash-crumb time { flex: none; color: var(--muted); }
.axonpack-crash-crumb span {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
`;
