/**
 * Puts our panel buttons inside the bar `@axonpack/react-native-devtools-tab` draws above the tab.
 *
 * That bar is the package's, and it takes nothing of ours, so this rearranges the page instead:
 * `display: contents` on the bar and on the body lets their children join one grid on `#root`, and
 * the buttons take the row the bar was in, between its name and refresh. Nothing is moved in the
 * DOM, because the page's own React owns those nodes and would fail on the next update if it were.
 *
 * It leans on the package's class names, which are not public API. If the bar ever renders on its
 * own row again under our buttons, a class name changed.
 *
 * While the package's refresh is running the body holds its loader instead of us, so this style is
 * gone too and the bar is drawn normally until the tab is back.
 */
export const BAR_LAYOUT_CSS = `
#root {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-rows: var(--bar-height) minmax(0, 1fr);
}
#root::before {
  content: "";
  grid-area: 1 / 1 / 2 / -1;
  background: var(--bar);
  border-bottom: 1px solid var(--line);
}
.axonpack-tab-bar,
.axonpack-tab-body {
  display: contents;
}
.axonpack-tab-name {
  grid-area: 1 / 1;
  align-self: center;
  padding: 0 12px 0 8px;
}
.axonpack-tab-bar > button {
  grid-area: 1 / 3;
  align-self: center;
  margin-right: 4px;
}
.axonpack-panel-tabs {
  grid-area: 1 / 2;
  display: flex;
  min-width: 0;
  overflow-x: auto;
  font: 500 12px system-ui, sans-serif;
}
.axonpack-panel-tabs button {
  padding: 0 10px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--muted);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
}
.axonpack-panel-tabs button:hover {
  background: var(--hover);
}
.axonpack-panel-tabs button[aria-selected="true"] {
  border-bottom-color: var(--link);
  color: var(--fg);
}
.axonpack-panel-body {
  grid-area: 2 / 1 / 3 / -1;
  min-height: 0;
  overflow: auto;
}
`;
