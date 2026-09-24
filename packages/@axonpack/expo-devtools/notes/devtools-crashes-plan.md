# DevTools tab crashes plan

The Crashes panel in the React Native DevTools tab, feature for feature with the on-device Crashes
tab and its report sheet. Today it is a placeholder. The device side is done in every case, so the
work is drawing it in the tab, in `div`s, over the same stores.

Written 2026-09-24, from a line-by-line read of `features/crash/`.

**State, 2026-09-24:** steps 1 to 8 are written, with the tab badges. Type-check, lint and the
full test suite are clean, and Metro bundles it. None of it has been looked at in DevTools yet, so
no box below is ticked. The report opens in a side pane.

## Business flow

- [ ] Open the Axonpack tab in DevTools, pick Crashes, and every crash the app has recorded is
      there, newest first.
- [ ] A crash that happens while DevTools is open shows up in the list as it happens.
- [ ] A row shows the kind's icon and colour, the error's name, two lines of the message, the kind,
      whether it was from the last launch, how many breadcrumbs it has, and the time.
- [ ] An unread crash has a dot. Opening it marks it read, on the phone too.
- [ ] Mark all read clears every dot. Clear throws the reports away, on both sides.
- [ ] The toolbar counts the reports, as `3` or as `1 / 3` when a filter hides some.
- [ ] Open the filters, search the name, message and stack, with match case, whole word and regex.
      A bad pattern is marked.
- [ ] Filter by kind, several at once, each with its count. Only kinds that have happened are
      offered.
- [ ] Nothing recorded says so, and says what lands here. A filter that matches nothing says that
      instead.
- [ ] Click a row and its report opens beside the list, with Summary and Breadcrumbs tabs.
- [ ] Summary leads with the kind, the name and the message, then when it was captured.
- [ ] A crash from the last launch says the app did not survive it.
- [ ] A native exception shows its exception class and its thread.
- [ ] Whatever the app attached with `setCrashContext` is listed, one line per key.
- [ ] The stack is named by the dev server, with a note while that is happening, and the raw
      frames if nothing answers.
- [ ] The source around where it threw is shown, with the line marked. A render error also shows
      the element that rendered it.
- [ ] Library frames are hidden behind "See N more frames". Clicking a frame shows its full path.
- [ ] A render error shows its component stack. A native exception shows its native frames.
- [ ] Device details are folded away, and say so when the app ran somewhere they cannot be read.
- [ ] Breadcrumbs list the console and network activity before the crash, each with its time and
      coloured by how bad it was. With none recorded, it says how to turn them on.
- [ ] Copy the title, the message, the stack, or the whole report as Markdown or JSON, onto the
      computer's clipboard.
- [ ] Download the report as a file, where the phone would share it.
- [ ] Open report on a crash in the Console panel opens that report here.
- [ ] The filters set on one side are set on the other.
- [ ] The panel follows the theme picked on either side.

## Reference behaviour

The on-device Crashes tab and its report sheet are the behaviour. Chrome has no crashes panel, so
the look comes from the tab's own Network panel: its toolbar and filter bar, and a list with the
detail pane opening beside it, with Summary and Breadcrumbs as that pane's tabs. A crash read in
DevTools should look like a request read in DevTools.

Not mirrored from the device:

- **The crash popup and the compact notice.** They are the app's UI in front of whoever is holding
  the phone. DevTools gets the list and the report, which is what a developer reads.
- **The error boundary's Try again screen.** Also the app's own UI.
- **Share.** There is no share sheet on a desktop. The report downloads as a file instead, the way
  the Network panel's export does.
- **The release-build note in the Stack section.** A tab only exists in a development build, so it
  would never show.
- **A bottom sheet.** A report opens in a side pane, as a request does.

## Architecture

Everything lives in `src/devtools-remote-tab/components/crashes-panel/`, the way the other panels
live in their own folders. `index.tsx` composes, one file per piece:

| File                                         | Is the device's                               |
| -------------------------------------------- | --------------------------------------------- |
| `index.tsx`                                  | `crash-view.component.tsx` (layout only)      |
| `toolbar.component.tsx`                      | `DevtoolsToolbar` + mark all read + the count |
| `filter-bar.component.tsx`                   | the filters: search and the kind chips        |
| `crash-list.component.tsx`                   | the `FlatList` and its two empty texts        |
| `crash-row.component.tsx`                    | `crash-row.component.tsx`                     |
| `crash-detail/index.tsx`                     | `crash-detail/index.tsx` (tabs, title, menu)  |
| `crash-detail/summary-tab.component.tsx`     | `summary-tab.component.tsx`                   |
| `crash-detail/stack-section.component.tsx`   | `stack-section.component.tsx`                 |
| `crash-detail/stack-frames.component.tsx`    | `stack-frames.component.tsx`                  |
| `crash-detail/source-frames.component.tsx`   | `source-frames.component.tsx`                 |
| `crash-detail/device-section.component.tsx`  | `device-section.component.tsx`                |
| `crash-detail/breadcrumbs-tab.component.tsx` | `breadcrumbs-tab.component.tsx`               |
| `crash-detail/report-menu.component.tsx`     | `crash-menu-items.util.ts` + `ContextMenu`    |
| `crashes-panel-css.const.ts`                 | the styles                                    |

**Nothing in the thinking is written again.** These are the device's and are imported as they are:
`crashStore` (`getSnapshot`, `markSeen`, `markAllSeen`, `clear`), `getCrashKindVisual`,
`CRASH_KIND_LABELS`, `formatCrashTitle`, `formatCrashTime`, `formatCrashReport`,
`formatCrashJson`, `parseStack`, `parseComponentStack`, `symbolicateStack`, `isMarkedCodeFrameLine`,
`formatFrameLocation`, `formatSize`, and `buildMatcher` / `testMatch`. The Console panel's
`CRASH_KIND_ICONS` and its icon masks, and the Network panel's `SyncedInput`, `SplitResizer`, bar
and button classes and its section and code-frame styles, are imported, not copied. Two panels
then use the kind icons, so they moved out of `console-panel/` into
`devtools-remote-tab/constants/console-icons.const.ts`, with `CONSOLE_ICON_CSS` for their masks.

**The filters are one store for both surfaces**, as the Console's are. `crash-view.component.tsx`
holds its search, modes, kinds and whether the filters are open in `useState`, and its filter is
inline. Following the Console decision, they move to a `crashViewStore` beside `crashStore`, and a
`filter-crash-records.util.ts` holds `filterCrashRecords`, `countByKind` and `KIND_ORDER`, which
both views call. The app's view reads them from there first, with a test, before the tab uses them.

**Which report is open stays each surface's own**, as a selected request does in Network. On the
phone, `crashInspectionStore` raises a sheet over whatever tab is open, so the tab must not write
to it: opening a report in DevTools would throw a sheet up on the phone. The tab keeps its own
selection in the panel. Only a report asked for from another panel goes through the tab's own
`axonpackTabStore`.

**Opening a report marks it read on both sides**, through `crashStore.markSeen`, as opening it on
the phone does. The unread count is shared state, and a report read in DevTools has been read.

### What the wire allows, and what that forces

**Collapsible sections are `details`.** The browser opens and closes them without asking the app,
and a re-render from the app leaves them as they were, as long as `open` is only set on first
render. Device is folded by default, as on the phone.

**A frame is one line**, so the frame list scrolls sideways with `white-space: pre` rather than
wrapping, as on the phone.

**Copy is `COPY_ATTRIBUTE`**, so it lands on the computer. **Download is a `data:` link built on
hover**, as the Network export is, because a click cannot wait for the app to build a file. One
link for Markdown, one for JSON.

**The ⋮ menu is the Network row menu's pattern**: a backdrop span that closes it, and menu items that
carry their copy text.

**Symbolication is cached by record id** in the device's service, so a report opened on the phone
and then in DevTools asks the dev server once.

**Only the active panel is mounted.** Switching away drops the open report and the pane width. The
filters survive because they are in the store.

**The store holds 25 reports at most**, so the list is plain DOM, with no virtualising.

## Order of work

1. **The shared store.** `crashViewStore` and `filter-crash-records.util.ts` in `features/crash/`,
   the app's `CrashView` switched to them, one test for the filter. Ends with the app's Crashes tab
   working exactly as before.
1. **The list and the toolbar.** Panel wired into `panels.const.tsx`, clear, mark all read, the
   count, rows with every badge and the unread dot, the empty texts. Ends with the example app's
   crash buttons filling the list in DevTools, and Clear clearing the phone.
1. **Filters.** Search with modes and the invalid mark, kind buttons with counts. Ends with the
   same filter showing the same rows on both sides.
1. **The report pane.** Opens beside the list with the split resizer, closes, marks read. Summary
   and Breadcrumbs tabs. The title with Copy. Summary's overview: kind, name, message, time, the
   previous-launch note, exception and thread, context. Ends with any report readable.
1. **Stack.** Symbolicating note, Sources, frames with the library toggle and the full path on a
   click, component stack, native frames. Ends with a render error showing both sources.
1. **Device and Breadcrumbs.** Ends with a crash from the example app showing its device and its
   trail.
1. **Copy and download.** The ⋮ menu's four copies, and the two downloads. Ends with a report
   pasted from the computer's clipboard and saved as a file.
1. **Open report from the Console.** Through `axonpackTabStore`, with the tab badges alongside.
   Ends with a crash card in the Console panel opening its report here.
1. **Notes.** Tick Crashes in `react-native-devtools.md`, move this plan to `logs/`, and take the
   Open report line off the Console plan.

## Not in this plan

- **Sending reports to a backend, grouping duplicates, capturing the route.** The device does not
  have them yet (`crash.md`). When it does, the tab gets them in the same change.
- **The crash popup, the compact notice and Try again.** App UI, not a developer's view (see above).
- **Symbolicating a release bundle.** A tab only runs against a development build.

## Open decisions

None left. Both were settled 2026-09-24:

- **Open report from another panel** goes through `axonpackTabStore`
  (`devtools-remote-tab/stores/axonpack-tab.store.ts`), which holds the active panel and the report
  asked for. `AxonpackTab` reads the panel from it, the Console writes the ask, and the Crashes
  panel opens the report on mounting and clears the ask. It is the tab's own store, never the
  phone's `crashInspectionStore`.
- **Tab badges** are a `Badge` component on a panel's entry in `PANELS`, each subscribed to its own
  number: `consoleLogStore.getErrorCount` for Console, a new `crashStore.getUnseenCount` for
  Crashes. Hidden on the open tab, as in the app.
