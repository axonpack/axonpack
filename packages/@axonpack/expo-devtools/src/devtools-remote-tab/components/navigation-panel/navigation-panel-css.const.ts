/**
 * The Navigation panel. It sits inside `.axonpack-net`, so its bar, filter box, table, sections and
 * pane are the Network panel's classes, and only the tree, the row marks and the form are here.
 */
export const NAVIGATION_PANEL_CSS = `
.axonpack-nav mark {
  background: color-mix(in srgb, var(--net-pending) 45%, transparent);
  color: inherit;
}
.axonpack-nav-muted { color: var(--muted); }
.axonpack-nav-count { margin: 0 6px; color: var(--muted); }
.axonpack-nav-filters .axonpack-net-types { flex-wrap: wrap; height: auto; }
.axonpack-nav-text-button {
  height: 20px;
  margin: 0 3px;
  padding: 0 8px;
  border: 1px solid var(--link);
  border-radius: 10px;
  background: none;
  color: var(--link);
  font: 600 11px system-ui, sans-serif;
  white-space: nowrap;
  cursor: pointer;
}
.axonpack-nav-text-button:hover { background: var(--hover); }
.axonpack-nav-error { margin: 4px 12px; color: var(--net-red); font-size: 11px; }
.axonpack-net-editor .axonpack-nav-error { margin: 0; }
.axonpack-nav-choices { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.axonpack-nav-choices .axonpack-net-type { margin: 0; }
.axonpack-nav-label { color: var(--muted); font-size: 11px; }
.axonpack-nav .axonpack-net-editor textarea { min-height: 72px; }
.axonpack-nav-tree { padding: 2px 0 6px; }
.axonpack-nav-node {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 22px;
  padding-right: 12px;
  border-left: 2px solid var(--track);
  margin-left: 12px;
}
.axonpack-nav-hit { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; }
.axonpack-nav-hit[data-clickable] { cursor: pointer; }
.axonpack-nav-chip {
  padding: 0 7px;
  border: 1.5px solid var(--track);
  border-radius: 8px;
  color: var(--track);
  font-size: 11px;
  font-weight: 700;
}
.axonpack-nav-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border: 2px solid var(--line);
  border-radius: 50%;
  background: var(--bg);
}
.axonpack-nav-node[data-active] .axonpack-nav-dot { border-color: var(--track); background: var(--track); }
.axonpack-nav-node[data-on-screen] .axonpack-nav-dot {
  width: 10px;
  height: 10px;
  border-color: var(--net-section);
  background: var(--net-success);
}
.axonpack-nav-name { color: var(--muted); white-space: nowrap; }
.axonpack-nav-node[data-active] .axonpack-nav-name { color: var(--fg); font-weight: 600; }
.axonpack-nav-node[data-on-screen] .axonpack-nav-name { font-weight: 700; }
.axonpack-nav-hosts { color: var(--muted); font-size: 11px; white-space: nowrap; }
.axonpack-nav-pill {
  padding: 0 6px;
  border: 1px solid var(--link);
  border-radius: 8px;
  color: var(--net-success);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}
.axonpack-nav-params {
  min-width: 0;
  overflow: hidden;
  color: var(--muted);
  font: 11px ui-monospace, Menlo, Consolas, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.axonpack-nav-node .axonpack-net-action { padding: 0 8px; font-size: 11px; }
.axonpack-nav-action { font-size: 10px; font-weight: 700; text-transform: uppercase; }
.axonpack-nav-badge {
  margin-left: 4px;
  padding: 0 5px;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--muted);
  font-size: 10px;
}
.axonpack-net-row[data-noop] { opacity: 0.6; }
.axonpack-net-row > span[data-live] { color: var(--net-success); font-weight: 600; }
.axonpack-net-row[data-selected] > span[data-live] { color: inherit; }
`;
