import type { ConsoleLogLevel } from '../../features/console/stores/console-log.store';
import type { CrashKind } from '../../features/crash/stores/crash.store';

/**
 * Chrome DevTools' console glyphs, copied from `front_end/Images` in `@react-native/debugger-frontend`
 * (BSD-licensed), the same way `chrome-icons.const.ts` holds the Network ones. The Console and
 * Crashes panels both draw them.
 */
export const CONSOLE_ICONS = {
  info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="M9.25 14h1.5V9h-1.5zM10 7.5a.72.72 0 0 0 .531-.219.72.72 0 0 0 .219-.531.72.72 0 0 0-.219-.531A.72.72 0 0 0 10 6a.72.72 0 0 0-.531.219.72.72 0 0 0-.219.531q0 .312.219.531A.72.72 0 0 0 10 7.5M10 18a7.8 7.8 0 0 1-3.104-.625 8.1 8.1 0 0 1-2.552-1.719 8.1 8.1 0 0 1-1.719-2.552A7.8 7.8 0 0 1 2 10q0-1.667.625-3.115a8.066 8.066 0 0 1 4.271-4.26A7.8 7.8 0 0 1 10 2q1.667 0 3.115.625a8.1 8.1 0 0 1 4.26 4.26Q18 8.333 18 10a7.8 7.8 0 0 1-.625 3.104 8.07 8.07 0 0 1-4.26 4.271A7.8 7.8 0 0 1 10 18m0-1.5q2.708 0 4.604-1.896T16.5 10t-1.896-4.604T10 3.5 5.396 5.396 3.5 10t1.896 4.604T10 16.5"/></svg>',
  'warning-filled':
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" fill-rule="evenodd" d="m1 17 9-15 9 15zM11 7v5H9V7zm-1 8.1a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2" clip-rule="evenodd"/></svg>',
  'cross-circle-filled':
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="M7.062 14 10 11.062 12.938 14 14 12.938 11.062 10 14 7.062 12.938 6 10 8.938 7.062 6 6 7.062 8.938 10 6 12.938zM10 18a7.8 7.8 0 0 1-3.104-.625 8.1 8.1 0 0 1-2.552-1.719 8.1 8.1 0 0 1-1.719-2.552A7.8 7.8 0 0 1 2 10q0-1.667.625-3.115a8.066 8.066 0 0 1 4.271-4.26A7.8 7.8 0 0 1 10 2q1.667 0 3.115.625a8.1 8.1 0 0 1 4.26 4.26Q18 8.333 18 10a7.8 7.8 0 0 1-.625 3.104 8.07 8.07 0 0 1-4.26 4.271A7.8 7.8 0 0 1 10 18"/></svg>',
  'cross-circle':
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="M7.062 14 10 11.062 12.938 14 14 12.938 11.062 10 14 7.062 12.938 6 10 8.938 7.062 6 6 7.062 8.938 10 6 12.938zM10 18a7.8 7.8 0 0 1-3.104-.625 8.1 8.1 0 0 1-2.552-1.719 8.1 8.1 0 0 1-1.719-2.552A7.8 7.8 0 0 1 2 10q0-1.667.625-3.115a8.066 8.066 0 0 1 4.271-4.26A7.8 7.8 0 0 1 10 2q1.667 0 3.115.625a8.1 8.1 0 0 1 4.26 4.26Q18 8.333 18 10a7.8 7.8 0 0 1-.625 3.104 8.07 8.07 0 0 1-4.26 4.271A7.8 7.8 0 0 1 10 18m0-1.5q2.708 0 4.604-1.896T16.5 10t-1.896-4.604T10 3.5 5.396 5.396 3.5 10t1.896 4.604T10 16.5"/></svg>',
  warning:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="m1 18 9-15 9 15zm2.646-1.5h12.708L10 5.917zm6.354-1a.72.72 0 0 0 .531-.219.72.72 0 0 0 .219-.531.72.72 0 0 0-.219-.531A.72.72 0 0 0 10 14a.72.72 0 0 0-.531.219.72.72 0 0 0-.219.531q0 .312.219.531A.72.72 0 0 0 10 15.5M9.25 13h1.5V9h-1.5z"/></svg>',
  bug: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="M10 17a4 4 0 0 1-2.271-.677A3.6 3.6 0 0 1 6.292 14.5H4V13h2v-1.25H4v-1.5h2V9H4V7.5h2.292q.166-.542.541-.979.375-.438.855-.771L6 4.062 7.062 3l2.105 2.083a3.46 3.46 0 0 1 1.687 0L12.938 3 14 4.062 12.312 5.75q.48.333.834.771.354.437.562.979H16V9h-2v1.25h2v1.5h-2V13h2v1.5h-2.292a3.6 3.6 0 0 1-1.437 1.823A4 4 0 0 1 10 17m0-1.5q1.02 0 1.74-.729A2.59 2.59 0 0 0 12.5 13V9a2.26 2.26 0 0 0-.698-1.771 2.45 2.45 0 0 0-1.781-.729q-1.063 0-1.781.729A2.5 2.5 0 0 0 7.5 9v4a2.34 2.34 0 0 0 .708 1.771q.73.729 1.792.729M8.5 13h3v-1.5h-3zm0-2.5h3V9h-3z"/></svg>',
  report:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#041E49" viewBox="0 -960 960 960"><path d="M480-280q17 0 28.5-11.5T520-320t-11.5-28.5T480-360t-28.5 11.5T440-320t11.5 28.5T480-280m-40-160h80v-240h-80zM330-120 120-330v-300l210-210h300l210 210v300L630-120zm34-80h232l164-164v-232L596-760H364L200-596v232zm116-280"/></svg>',
  memory:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="M5.5 7H7v5H5.5zM14.5 7H13v5h1.5zM9.25 7h1.5v5h-1.5z"/><path fill="#000" fill-rule="evenodd" d="M6.5 2H5v2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2v2h1.5v-2h2.75v2h1.5v-2h2.75v2H15v-2h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2V2h-1.5v2h-2.75V2h-1.5v2H6.5zm-3 11.5v-8h13v8z" clip-rule="evenodd"/></svg>',
  history:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="M10 17q-2.916 0-4.958-2.042T3 10h1.5q0 2.271 1.615 3.885Q7.729 15.5 10 15.5t3.885-1.615Q15.5 12.271 15.5 10t-1.615-3.885T10 4.5q-1.292 0-2.386.533A5.3 5.3 0 0 0 5.77 6.5H8V8H3V3h1.5v2.708A6.95 6.95 0 0 1 6.885 3.73 6.75 6.75 0 0 1 10 3q1.458 0 2.732.554 1.273.555 2.217 1.497a7.1 7.1 0 0 1 1.497 2.217Q17 8.543 17 10q0 1.458-.554 2.732a7.1 7.1 0 0 1-1.498 2.217 7.1 7.1 0 0 1-2.216 1.497Q11.458 17 10 17m2.083-4.167L9.25 10V6h1.5v3.375l2.396 2.396z"/></svg>',
  'chevron-right':
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="m8 15-1.062-1.062L10.875 10 6.938 6.062 8 5l5 5z"/></svg>',
  'chevron-left-dot':
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="m10 15-5-5 5-5 1.062 1.062L7.125 10l3.937 3.938z"/><circle cx="12.5" cy="10.125" r="1.25" fill="#000"/></svg>',
  play: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="M7 15.5v-11l8.5 5.5zm1.5-2.75L12.75 10 8.5 7.25z"/></svg>',
  'triangle-down':
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"><path fill="#000" d="m7 9.45 3.85-5.6h-7.7"/></svg>',
  'check-double':
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="m6.104 14.146-3.541-3.542 1.062-1.062 2.48 2.479 1.062 1.062zm4.25-.021-3.541-3.52 1.062-1.063 2.48 2.479 6-6.021 1.062 1.063zm0-4.23L9.292 8.834 12.125 6l1.063 1.063z"/></svg>',
  terminal:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><g clip-path="url(#a)"><path fill="#000" d="M3.5 16q-.625 0-1.062-.437A1.45 1.45 0 0 1 2 14.5v-9q0-.625.438-1.062A1.45 1.45 0 0 1 3.5 4h13q.625 0 1.063.438Q18 4.874 18 5.5v9q0 .624-.437 1.063A1.45 1.45 0 0 1 16.5 16zm0-1.5h13V7h-13zm2.75-1-1.062-1.062 1.687-1.688-1.687-1.687L6.25 8 9 10.75zm3.75 0V12h5v1.5z"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h20v20H0z"/></clipPath></defs></svg>',
  'dots-vertical':
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"><path fill="#000" d="M10 16q-.625 0-1.062-.438A1.44 1.44 0 0 1 8.5 14.5q0-.625.438-1.062A1.44 1.44 0 0 1 10 13q.625 0 1.062.438.438.437.438 1.062t-.438 1.062A1.44 1.44 0 0 1 10 16m0-4.5q-.625 0-1.062-.438A1.44 1.44 0 0 1 8.5 10q0-.625.438-1.062A1.44 1.44 0 0 1 10 8.5q.625 0 1.062.438.438.437.438 1.062t-.438 1.062A1.44 1.44 0 0 1 10 11.5M10 7q-.625 0-1.062-.438A1.44 1.44 0 0 1 8.5 5.5q0-.625.438-1.062A1.44 1.44 0 0 1 10 4q.625 0 1.062.438.438.437.438 1.062t-.438 1.062A1.44 1.44 0 0 1 10 7"/></svg>',
} as const;

export type ConsoleIcon = keyof typeof CONSOLE_ICONS;

// Its own attribute, not the Network panel's `data-icon`: both sets have a `cross-circle-filled`,
// and whichever rule loaded last would win for both panels.
export const CONSOLE_ICON_CSS = `
[data-con-icon]::before {
  content: "";
  flex: none;
  width: 14px;
  height: 14px;
  background: currentColor;
  -webkit-mask: var(--icon) center / contain no-repeat;
  mask: var(--icon) center / contain no-repeat;
}
${Object.entries(CONSOLE_ICONS)
  .map(
    ([name, svg]) =>
      `[data-con-icon="${name}"]::before { --icon: url("data:image/svg+xml,${encodeURIComponent(svg)}"); }`
  )
  .join('\n')}
`;

/** Chrome's glyph for each level. A plain log has none, as in the app, so its text keeps the edge. */
export const LEVEL_ICONS: Record<ConsoleLogLevel, ConsoleIcon | null> = {
  log: null,
  info: 'info',
  warn: 'warning-filled',
  error: 'cross-circle-filled',
  debug: 'bug',
  crash: 'report',
  input: 'chevron-right',
  result: 'chevron-left-dot',
};

/** The app gives each kind its own icon on a crash row, so the tab does too. */
export const CRASH_KIND_ICONS: Record<CrashKind, ConsoleIcon> = {
  'js-fatal': 'report',
  'js-error': 'cross-circle',
  'unhandled-rejection': 'warning',
  'react-render': 'cross-circle',
  'native-exception': 'memory',
};
