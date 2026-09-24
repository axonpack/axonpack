# DevTools tab console plan

The Console panel in the React Native DevTools tab, feature for feature with the on-device Console
tab. Today it is a placeholder. The device side is done in every case, so the work is drawing it in
the tab, in `div`s, over the same stores.

Written 2026-09-24, from a line-by-line read of `features/console/`.

**State, 2026-09-24:** steps 1 to 8 are written, type-check and lint clean. None of it has been
looked at in DevTools yet, so no box below is ticked. The jump-to-newest link was taken out again
after it was built; scrolling back down is the way back.

## Business flow

- [ ] Open the Axonpack tab in DevTools, pick Console, and every log the app has written is there,
      oldest at the top, newest at the bottom beside the prompt.
- [ ] A new log shows up in DevTools as it is written, and the list stays on the newest one.
- [ ] Scroll back and the list stops moving under you.
- [ ] Pause recording in DevTools and the phone stops recording too. Resume on the phone and
      DevTools shows it. Clear on either side clears both.
- [ ] The toolbar counts warnings, errors and crashes, each in its own colour, and hides a count
      that is zero.
- [ ] Open the filters, type a search, and only matching rows stay, with the match marked. Match
      case, whole word and regex work the same as on the phone, and a bad pattern is marked.
- [ ] Filter to one level: All, Logs, Info, Warnings, Errors, Debug or Crashes, each with its live
      count.
- [ ] Once a WebView has logged, filter by where a row came from: the app or that page.
- [ ] A plain log has no icon. Info, warning, error and debug each have their icon and colour, and
      warnings and errors tint the whole row.
- [ ] Every argument gets its own line. A string reads as text, a number or boolean in its colour,
      `null` and `undefined` greyed.
- [ ] A long string is cut at six lines with Show more and Show less.
- [ ] An object or array is a collapsed tree with its label (`Array(3)`, `Map(2)`, a class name),
      and a search opens the branches that match.
- [ ] An error shows its message. The arrow beside it opens the stack.
- [ ] A warning or error says which file and line it came from, named by the dev server.
- [ ] A row from a WebView says which one. A repeated row says how many times. Every row says when.
- [ ] Copy on a row puts its text on the computer's clipboard, not the phone's.
- [ ] A crash is a card, not a line: its kind's icon and colour, the name, the message, the kind,
      whether it was from the last launch, how many breadcrumbs, where it came from, the time, and
      Open report.
- [ ] Open report, from a crash card or from an error that caused a crash, shows that crash's
      report.
- [ ] When the prompt is on, type an expression, press Enter or Run, and the input and its result
      appear as rows. A promise shows pending and fills in.
- [ ] Suggestions appear above the prompt while typing, members of the object included. Click one
      to complete.
- [ ] Click an earlier input row and it goes back into the prompt, with the caret there.
- [ ] What is typed in the prompt on one side is in the prompt on the other.
- [ ] `$modules`, `$m` and the names the app hands in through its config all work, because the
      expression runs in the app.
- [ ] Nothing captured says so. A filter that matches nothing says that instead.
- [ ] The panel follows the theme picked on either side.

## Reference behaviour

Chrome's Console is the look: its toolbar, its row layout, its level colours and icons, its prompt
docked at the bottom. The on-device Console tab is the behaviour, and where the two differ, the
device wins, because the two surfaces read the same store and must agree.

Not mirrored from Chrome:

- **Chrome's levels dropdown, with several levels on at once.** The device filters to one level
  at a time. Two ways to filter one list would make the phone and the tab show different rows for
  the same filter.
- **Grouping, `console.table`, `console.time`, `%c` styling.** The device captures none of them.
- **Chrome's Console settings, sidebar and live expressions.** Nothing on the device backs them.
- **Arguments flowing inline on one line.** The device gives each its own line, on purpose (see
  `console.md`), and a desktop is wide enough that it does not hurt.

Not mirrored from the device:

- **The keyboard, the insets and the interactive dismiss.** A browser has none of that.
- **Tap-and-hold selection rules.** Text in a `div` is selectable already.
- **The scroll-to-bottom button.** A browser list is one keypress (End) or one flick from the
  newest row, so the tab does without it.

## Architecture

Everything lives in `src/devtools-remote-tab/components/console-panel/`, the way the network panel
lives in `network-panel/`. `index.tsx` composes, one file per piece:

| File                             | Is the device's                                   |
| -------------------------------- | ------------------------------------------------- |
| `index.tsx`                      | `console-view.component.tsx` (layout only)        |
| `toolbar.component.tsx`          | `DevtoolsToolbar` + the filter button + counts    |
| `filter-bar.component.tsx`       | the filters panel: search, Level, Source          |
| `console-list.component.tsx`     | the `FlatList`, empty text                        |
| `console-row.component.tsx`      | `console-row.component.tsx`                       |
| `crash-row.component.tsx`        | `console-crash-row.component.tsx`                 |
| `arg-cell.component.tsx`         | `console-arg-cell.component.tsx`                  |
| `text-arg.component.tsx`         | `text-arg-cell.component.tsx`                     |
| `error-arg.component.tsx`        | `error-arg-cell.component.tsx`                    |
| `highlighted-text.component.tsx` | `highlighted-text.ui.tsx`                         |
| `call-site.component.tsx`        | `call-site.component.tsx`                         |
| `prompt.component.tsx`           | `console-prompt.component.tsx`                    |
| `console-panel-css.const.ts`     | the styles, as `NETWORK_PANEL_CSS` is for network |
| `console-icons.const.ts`         | the level and crash-kind icons, as Chrome's SVGs  |
| `row-style.util.ts`              | a row's colours as CSS variables                  |

The CSS sits in the panel's folder rather than `constants/` so this work stays in one folder. It
can move beside `network-panel-css.const.ts` when nobody else is editing there.

**Nothing in the thinking is written again.** These are the device's and are imported as they are:
`consoleLogStore`, `consolePromptStore`, `crashInspectionStore`, `buildMatcher` / `testMatch` /
`findMatches`, `consoleLevelVisuals`, `CONSOLE_LEVELS`, `CONSOLE_LEVEL_LABELS`, `resolveRowVisual`,
`formatConsoleSource`, `NATIVE_CONSOLE_SOURCE`, `CRASH_KIND_LABELS`, `symbolicateStack`,
`primaryCallSite`, `formatFrameLocation`, `getCompletions`, `runReplCommand`,
`normalizeExpressionInput`, `isReplEnabled`, `consoleViewStore`, `filterConsoleEntries`,
`countByLevel` and `listSources`. The prompt evaluates in the app, so `$m`, `$modules` and
`console.context` come free.

**The filters are one store for both surfaces.** `consoleViewStore` holds the search, its modes,
the level, the source and whether the filters are open. `filterConsoleEntries`, `countByLevel` and
`listSources` are the whole of the filtering, and the app's `ConsoleView` already reads all of it
from there. So a filter set on the phone is set in DevTools, and the tab keeps its filters when
another panel is picked and it unmounts. Settled 2026-09-24.

The network panel's `SyncedInput`, `JsonTree` and its `data-icon` mask CSS are imported from
`network-panel/`, not copied. The panel sits inside `.axonpack-net`, so the bar, its buttons, the
filter box and the type buttons are the Network panel's classes, theme included. Two additive props
went into that folder for it: `rootLabel`, `defaultExpanded` and `matcher` pass through the
`JsonTree` wrapper, and `SyncedInput` takes `autoFocus`. `isClampable` is exported from the app's
`text-arg-cell.component.tsx` so both cut a string at the same place.

**The console's icons use `data-con-icon`, not `data-icon`.** Both sets have an `arrow-down` and a
`cross-circle-filled`, and whichever rule loaded last would have won for both panels.

### What the wire allows, and what that forces

**An event crosses as `{ type, key, target: { value, checked } }` and nothing else.** No
`shiftKey`, no scroll offset, and `preventDefault` does nothing.

- Enter to run works, as `onKeyDown` with `key === 'Enter'`. Shift+Enter for a second line cannot
  be told apart, so the prompt stays one line, as it is on the device.
- Tab to take a suggestion cannot be stopped from moving focus, so suggestions are clicked, as they
  are tapped on the device.
- **Following the newest row cannot use scroll events.** The list's scroll box is
  `flex-direction: column-reverse`, so the browser itself keeps it pinned to the bottom while you are
  there and leaves it alone once you scroll up. No effect, no offset, the same trick the device gets
  from an inverted list. The rows are rendered newest first, which is already the store's order.
- **The app cannot tell where the list is scrolled.** So a run from the prompt does not scroll you
  down the way it does on the phone.

**A controlled input loses typing.** The prompt and the search box use `SyncedInput`, which
remounts only when the value changes from somewhere else. Recalling an input row is such a change,
so the remount has to take `autoFocus`, or the caret is gone. Check where Chrome puts the caret on
that remount; it has to be at the end.

**A `FlatList` cannot cross** (see `react-native-devtools.md`). The list is plain `div`s. The store
holds 500 rows at most, so all of them render.

**Icons are masks, not `MaterialIcons`.** A `MaterialIcons` glyph draws as an empty box. Chrome's
console icons (info, warning, error, debug, the prompt chevrons, the crash kinds) go into the
panel's CSS as masks, the way `chrome-icons.const.ts` does it for network.

**Copy is `COPY_ATTRIBUTE`.** A click handler runs in the app and would copy to the phone.

**Only the active panel is mounted.** Switching to Network and back drops everything held in the
panel's own `useState`. That is one more reason the filters live in `consoleViewStore`.

## Order of work

1. **The list and the toolbar.** Panel wired into `panels.const.tsx`, record and clear, the three
   counts, rows showing `entry.text`, the two empty texts. Ends with live logs in DevTools, and
   record and clear moving the phone as well.
1. **Row anatomy.** Level icon or spacer, row tint, one cell per argument by kind, tone colours,
   error-level red, the six-line cut with Show more, the tree with its label, the error arrow and
   stack. Source, `×n`, time and Copy on the right. Ends with every kind of row the example app's
   Console demo writes drawn right.
1. **Crash cards.** Kind icon and colour through `resolveRowVisual`, name, count, Copy, three-line
   message, the badges, the time, Open report as a link that does nothing yet. Ends with the
   example app's crash buttons showing cards.
1. **Call site.** `file:line` on warnings, errors and crashes, symbolicated per row, the raw frame
   until it answers. Ends with a warning naming its source file.
1. **Filters.** The store and the filter helpers are done, and the app reads them. Left is the
   tab's side: search with modes and the invalid mark, highlights in text and trees, Level with
   counts, Source when there is more than one. Ends with the same filter showing the same rows on
   both sides.
1. **Follow the newest.** `column-reverse`. Ends with a
   log loop that stays pinned, and a scrolled-back list that stays still.
1. **The prompt.** Hidden unless `isReplEnabled()`. Shared draft, Enter and Run, Clear, Run greyed
   when empty, suggestions, recall with focus. Ends with `1 + 1` answering, a promise settling, and
   the draft matching on both sides.
1. **Open report.** A crash card's Open report, and the message of an error that caused a crash,
   switch to the Crashes panel with that report open. Ends with a crash card opening its report.
1. **Notes.** Tick Console in `react-native-devtools.md`, move this plan to `logs/`.

## Not in this plan

- **Command history on the arrow keys, a live result preview, `%s` `%d` `%o`, console rows in
  Export.** The device does not have them yet (`console.md`). Parity first; once the device has
  them, the tab gets them in the same change.
- **Virtualising the list.** 500 rows is fine as plain DOM. When `virtual-list-plan.md` in the tab
  package ships, the list can move to it.
- **Opening a call site in the editor.** The device cannot either.

## Open decisions

None left. Open report and the tab badges were settled 2026-09-24 with the Crashes panel: see
`devtools-crashes-plan.md`.
