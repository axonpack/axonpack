import { PANELS } from './panels.const';

const timeline = (id: string) => `--axonpack-tab-${id}`;

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
  --axonpack-chevrons: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2.5 3l5 5-5 5M8 3l5 5-5 5'/%3E%3C/svg%3E");
  grid-area: 1 / 2;
  position: relative;
  display: flex;
  min-width: 0;
  font: 500 12px system-ui, sans-serif;
  timeline-scope: ${PANELS.map((panel) => timeline(panel.id)).join(', ')};
}
/*
  Where fitting is worked out: the other tabs in order, then a copy of the active tab's label at the
  end, all laid out but never seen. It stops short of the bar by the width of », which is what
  leaves » room after the last tab shown. The copy reserves the active tab's width first, so a tab only
  fits here if everything before it and the active tab fit too. The row that is seen then shows the
  active tab always, and every other tab only while its copy here fits.
*/
.axonpack-panel-measure {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 16px;
  display: flex;
  visibility: hidden;
  pointer-events: none;
}
.axonpack-panel-measure-row,
.axonpack-panel-tab-row {
  flex: 1;
  min-width: 0;
  display: flex;
  overflow: hidden;
}
/* Keeps the measuring row overflowing even when every tab fits. A view timeline in a scroller with
   nothing to scroll can go inactive, and an inactive one would read every tab as not fitting. */
.axonpack-panel-tab-spacer {
  flex: none;
  width: 100%;
  /* Last however the tabs are ordered, since each copy carries an \`order\` of its own. */
  order: 9999;
}
.axonpack-panel-tab,
.axonpack-panel-measure-tab {
  flex: none;
  padding: 0 10px;
  border: 0;
  background: none;
  color: var(--muted);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
.axonpack-panel-tab:hover {
  background: var(--hover);
}
.axonpack-panel-tab {
  position: relative;
}
.axonpack-panel-tab[aria-selected="true"] {
  color: var(--fg);
}
/* A bar of its own rather than a bottom border, which cannot round its top corners. */
.axonpack-panel-tab[aria-selected="true"]::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--link);
}
.axonpack-panel-tab[data-dragging] {
  background: var(--hover);
  opacity: 0.3;
}
.axonpack-panel-tab-row[data-dragging],
.axonpack-panel-tab-row[data-dragging] * {
  cursor: grabbing;
}
/* Invisible strips over each tab while dragging. The one under the pointer is the anchor the dragged
   copy follows, since \`:hover\` is the one thing that tracks the pointer without leaving the page.
   Inside the tab, so entering a tab still reaches it and the reorder still hears about it. */
.axonpack-drag-spots {
  position: absolute;
  inset: 0;
  display: flex;
}
.axonpack-drag-spot {
  flex: 1;
}
/* Tall enough that the pointer stays over one wherever it goes up or down, so a drag carries on
   below the bar. The row stops clipping for as long as that lasts, and the page clips instead, at the
   window, so the strips cannot give it something to scroll. */
.axonpack-panel-tab-row[data-dragging] {
  overflow: visible;
}
.axonpack-panel-tab-row[data-dragging] .axonpack-drag-spots {
  top: -100vh;
  bottom: -100vh;
}
#root:has(.axonpack-panel-tab-row[data-dragging]) {
  overflow: clip;
}
.axonpack-drag-spot:hover {
  anchor-name: --axonpack-pointer;
}
.axonpack-drag-ghost {
  display: none;
}
/* The last thing in the tab row, so it sits right after the last tab shown. */
.axonpack-panel-more {
  order: 9999;
  flex: none;
  anchor-name: --axonpack-more;
  display: grid;
  place-items: center;
  width: 16px;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
}
.axonpack-panel-more:hover {
  background: var(--hover);
  color: var(--fg);
}
/* A mask rather than a character or an \`svg\`: an \`svg\` cannot cross from the app, and a glyph's
   weight is whatever the font makes it. This one is two thin chevrons in the bar's own colour. */
.axonpack-panel-more::before {
  content: "";
  width: 16px;
  height: 16px;
  background: currentColor;
  -webkit-mask: var(--axonpack-chevrons) center / contain no-repeat;
  mask: var(--axonpack-chevrons) center / contain no-repeat;
}
.axonpack-panel-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
}
.axonpack-panel-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 11;
  display: flex;
  flex-direction: column;
  min-width: 140px;
  padding: 4px 0;
  background: var(--pop);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: 0 2px 8px #0006;
}
.axonpack-panel-menu-item {
  padding: 4px 12px;
  border: 0;
  background: none;
  color: var(--fg);
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.axonpack-panel-menu-item:hover {
  background: var(--hover);
}
/*
  Each copy in the measuring row is the subject of its own view timeline, and the \`contain\` range
  is exactly "fully in view". It is stretched by a pixel at the end: the range is end-exclusive, and
  at scroll 0 the first tab sits exactly on that end, so plain \`contain\` counted it as cut off. An
  animation with no fill has no effect outside its range, so:
  - a tab is shown only while its copy fits, and collapses to nothing otherwise,
  - its menu entry is hidden while its copy fits, so the menu lists only what did not,
  - » and the menu follow the last tab's copy the same way, so they only show when something is missing.
  Without scroll-driven animations every tab shows, clipped, and the menu lists them all.
*/
@supports (animation-timeline: view()) {
  @keyframes axonpack-show-while-whole {
    from, to { max-width: none; padding: 0 10px; overflow: visible; visibility: visible; }
  }
  @keyframes axonpack-hide-while-whole {
    from, to { display: none; }
  }
  /* Collapsed rather than \`display: none\`. An element with no box runs no animation, so one hidden
     that way could never be shown again by its own. The animation undoes all of it, \`overflow\`
     included: left clipping, a shown tab cut its drag strips off at the bar. */
  .axonpack-panel-tab:not([aria-selected="true"]) {
    max-width: 0;
    padding: 0;
    overflow: hidden;
    visibility: hidden;
    animation: axonpack-show-while-whole linear;
    animation-range: contain 0% contain calc(100% + 1px);
  }
  .axonpack-panel-menu-item,
  .axonpack-panel-more,
  .axonpack-panel-menu {
    animation: axonpack-hide-while-whole linear;
    animation-range: contain 0% contain calc(100% + 1px);
  }
  @supports (anchor-name: --a) {
    /* Hidden when the pointer is over no strip, rather than dropped wherever it lands unanchored. */
    .axonpack-drag-ghost {
      position: absolute;
      top: 0;
      bottom: 0;
      z-index: 5;
      display: flex;
      align-items: center;
      padding: 0 10px;
      background: var(--bar);
      color: var(--fg);
      border-radius: 4px;
      box-shadow: 0 1px 4px #0005;
      white-space: nowrap;
      pointer-events: none;
      position-anchor: --axonpack-pointer;
      left: anchor(center);
      translate: -50% 0;
      position-visibility: anchors-valid;
    }
    /* Fixed, so the flip is judged against the screen. Absolute, it was judged against the tab strip,
       which the menu overflows anyway, so it never flipped and ran off the right edge. */
    .axonpack-panel-menu {
      position: fixed;
      position-anchor: --axonpack-more;
      top: anchor(bottom);
      left: anchor(left);
      right: auto;
      position-try-fallbacks: flip-inline;
    }
  }
${PANELS.map(
  (panel) => `  .axonpack-panel-measure-tab[data-id="${panel.id}"] {
    view-timeline: ${timeline(panel.id)} inline;
  }
  .axonpack-panel-tab[data-id="${panel.id}"],
  .axonpack-panel-menu-item[data-id="${panel.id}"],
  .axonpack-panel-more[data-last="${panel.id}"],
  .axonpack-panel-menu[data-last="${panel.id}"] {
    animation-timeline: ${timeline(panel.id)};
  }`
).join('\n')}
}
.axonpack-panel-body {
  grid-area: 2 / 1 / 3 / -1;
  min-height: 0;
  overflow: auto;
}
`;
