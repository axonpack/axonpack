# DevTools tab performance plan

The Performance panel in the React Native DevTools tab, feature for feature with the on-device
Performance tab. Today it is a placeholder. The device side is done in every case, so the work is
drawing it in the tab, in `div`s, over the same store.

Written 2026-09-24, from a line-by-line read of `features/performance/`.

## Business flow

- [ ] Open the Axonpack tab in DevTools, pick Performance, and it shows what the phone's
      Performance tab shows, from the same recording.
- [ ] Press record in DevTools and the phone starts measuring. Stop on the phone and DevTools stops
      too. Clear on either side clears both.
- [ ] Not recording and nothing recorded yet, the panel says so, lists what it would measure, and
      has a Start recording button. It says which readings need a dev build.
- [ ] Pick Statistics, User timing, Interactions or Long tasks. Each list shows its count once it
      has one.
- [ ] Frames per second shows the JS thread and the main thread now, and a chart of the last five
      minutes. Without a dev build the main thread says so instead of showing a number.
- [ ] With Performance open on the phone and in DevTools at once, both show the same frame rate and
      the same chart, and closing either one leaves the other counting.
- [ ] Memory shows the JS heap and the app's memory, each with its latest value and a chart, and
      how much of the device's memory is in use. Each says why when it has nothing to show.
- [ ] Interactions shows the slowest one and the average.
- [ ] Storage shows the disk used and free on Android, and why it is not shown on iOS or without a
      dev build.
- [ ] Startup shows the time from process start to first render, split into its phases, and what
      the platform reported beside it. A phase the platform did not report shows a dash.
- [ ] Long tasks lists every time the JS thread got stuck, when, and for how long, coloured by how
      bad it was.
- [ ] Interactions lists every slow tap or key press, how long the handler took, and the whole wait.
- [ ] User timing lists every mark and measure the app recorded, with its detail and its length.
- [ ] A list says when the platform dropped entries before the list kept them, and when this device
      cannot report that kind at all.
- [ ] Resources and Startup fold and unfold.
- [ ] The panel follows the theme picked on either side.

## Reference behaviour

The on-device Performance tab is both the look and the behaviour. Chrome's Performance panel is a
recorder of traces, which the device does not make, so there is nothing of it to copy. Chrome's
**Performance monitor** drawer is the nearest thing, live charts of a few numbers, and it is the
model for how the charts look: thin lines, a light grid, the value beside the label.

Not mirrored from Chrome:

- **Recording a trace, flame charts, heap snapshots.** They come from the debugger protocol, not
  from anything the app can read in itself (`performance.md`, Won't do).
- **The Performance monitor's choice of metrics.** The device shows a fixed set, and the tab shows
  the same one.

Not mirrored from the device:

- **Insets and the chip strip scrolling sideways.** A browser has room for the four section
  buttons in one row.

## Architecture

Everything lives in `src/devtools-remote-tab/components/performance-panel/`, the way the network
panel lives in `network-panel/`. `index.tsx` composes, one file per piece:

| File                             | Is the device's                                                     |
| -------------------------------- | ------------------------------------------------------------------- |
| `index.tsx`                      | `performance-view.component.tsx` (layout, the frame-rate effect)    |
| `toolbar.component.tsx`          | `DevtoolsToolbar` + `section-chips.component.tsx`                   |
| `idle-state.component.tsx`       | `idle-state.component.tsx`                                          |
| `resources.component.tsx`        | `resources-section.component.tsx`                                   |
| `fps-card.component.tsx`         | `fps-chart-card.component.tsx`                                      |
| `memory-card.component.tsx`      | `memory-chart-card.component.tsx`                                   |
| `memory-plot.component.tsx`      | the `Plot` inside `memory-chart-card.component.tsx`                 |
| `interaction-card.component.tsx` | `interaction-card.component.tsx` + `metric-card.component.tsx`      |
| `storage-card.component.tsx`     | `storage-card.component.tsx`                                        |
| `startup.component.tsx`          | `startup-timing.component.tsx`                                      |
| `entry-table.component.tsx`      | `entry-list.component.tsx` + the long task, interaction, timing row |
| `line-chart.component.tsx`       | `core/components/ui/line-chart.ui.tsx`                              |
| `usage-meter.component.tsx`      | `core/components/ui/usage-meter.ui.tsx`                             |
| `performance-panel-css.const.ts` | the styles, as `NETWORK_PANEL_CSS` is for network                   |

The CSS sits in the panel's folder rather than `constants/` so this work stays in one folder. It
can move beside `network-panel-css.const.ts` when nobody else is editing there.

**Nothing in the thinking is written again.** These are the device's and are imported as they are:
`performanceStore` with every getter the device views read (`getSnapshot`, `isPaused`, `getFps`,
`getUiFps`, `getFpsSeries`, `getUiFpsSeries`, `getFpsPeak`, `getFpsBucketCount`, `getFpsBucketMs`,
`getHeapPeak`, `getAppMemoryPeak`, `getSampleIntervalMs`, `getHistorySize`), `setPaused`, `clear`,
`startFpsMonitor`, `isUiFpsAvailable`, `formatMs`, `diffMs`, `getLongTaskColor`,
`formatLongTaskName`, `ageAxisLabels` and `formatSize`. The collectors already attach and detach
with the store's `paused`, so the record button here moves them with no extra code.

### One frame counter for both surfaces

The frame rate is counted once per app, and both surfaces read it from `performanceStore`, the
same way they read every other number here. Neither surface counts frames of its own.

Today each `PerformanceView` starts its own `startFpsMonitor()`, which was fine while there was one
surface. With two open, two counters run. Each writes its own reading every 500 ms, so the "last
5 min" chart fills in half the time. When either closes, it stops the native main-thread counter
and clears the readings under the other, and the main-thread number goes dead.

So `fps-monitor.service.ts` counts its users. The first `startFpsMonitor()` starts the frame loop
and the native counter. Later calls only join. Each call returns its own release, and the last
release stops both and clears the readings. The device view and the tab call it the same way, from
an effect keyed on `paused`, so the loop still runs only while someone is looking and recording is
on, which is the rule in `performance.md`. The monitor still does not belong to the collectors:
there it would run whenever recording is on, with no panel open to show it.

This is the one change outside the panel's folder. It is a change to the device's service, not a
second copy, and the device's view needs no edit.

The network panel's record, clear and toggle buttons (`.axonpack-net-button` and the
`record-start`, `record-stop` and `clear` masks in `chrome-icons.const.ts`) are reused, not copied.

### Every detail the device shows

So nothing is lost in the move, this is the full list, copied from the device's views.

**Toolbar.** Record and stop, from `isPaused`. Clear, titled "Clear recorded data". A divider,
then the sections in this order: Statistics, User timing, Interactions, Long tasks. A count is shown
only when it is not zero, as "Long tasks 3". Statistics never shows one.

**The panel.** The panel joins the shared frame counter while it is mounted and not paused, from an
effect keyed on `paused`, as on the device. "Never recorded" means no long tasks, no interactions
and no user timing. Memory samples do not count. Paused and never recorded, Statistics shows the
idle state in place of Resources. Startup shows either way.

**Idle state.** A red record badge, "Not recording", the line about measuring having a small cost,
four bullets (frame rate for both threads, memory for the heap and the app, long tasks, slow taps),
and Start recording, which unpauses. The footnote joins two optional lines: that startup timing is
already below (only on Statistics), and that main-thread FPS and device memory need a dev build
(only without the native module). One bullet has an em dash on the device. The tab's copy is
reworded and the device's is left to its owner.

**Frames per second.** The header says "last 5 min". Two readings, JS thread in the accent colour
and Main thread in the key accent. A reading shows a dash with no value yet, and "dev build" when
the native module is missing. The chart's top is `max(60, peak) + 5`, it holds
`getFpsBucketCount()` points filled from the right, and its x axis is `ageAxisLabels` over the
bucket count and length. The main-thread line is drawn only with the native module and more than
one point. With nothing to plot, a line says the chart fills in as frames are counted.

**Interactions card.** The worst duration as the value. The hint is "worst · X average of N", or
"Slowest event to next paint" with none recorded.

**Memory.** Two plots, JS Heap and App memory, each with its latest value on the right.

- JS Heap's caption: the engine does not report it, or "of X allocated", or waiting for the first
  sample.
- App memory's caption: needs a dev build, or waiting for the first sample.
- A plot's top is its peak times 1.1, it holds `getHistorySize()` points, its ticks are sizes, and
  its x axis is `ageAxisLabels` over the history size and sample interval.
- With more than one value the caption sits under the chart. Otherwise it takes the chart's place,
  and "Collecting…" stands in when there is no caption.
- With the native module, a Device memory meter follows: used is total minus available, captioned
  "X available to this app".

**Storage.** Three states: needs a dev build, the iOS note about the required-reason declaration,
or a Used meter with "X free".

**Meter.** Label and "X of Y" on one line, the bar, then the caption and the percentage. Unknown
values show a dash and an empty bar.

**Startup.** Hidden when neither block has anything.

- Measured, when process start and first render are both known: Total, Native startup, Bundle
  eval, App setup, To first render, and the note that the phase edges move with import order.
- Platform, when any of its four markers is known: a "Reported by the platform" heading only when
  the measured block is there, then Total, Native init, Runtime setup, Bundle eval. The note about
  dashes shows only when the measured block is not.

**Lists.** Newest first, as the store keeps them.

- Long tasks: a colour marker (200 ms and up is the error colour, 100 ms and up the warning colour,
  anything less is muted), the name through `formatLongTaskName`, the time, and the duration in the
  marker's colour.
- Interactions: the same marker, the event name, "handler X", and the duration.
- User timing: a pin for a mark or a ruler for a measure, the name, the detail when there is one, the time, and the
  duration, which is a dash for a mark.
- Above the rows, when there are rows: for long tasks, that these show when the thread was stuck
  and not what stuck it. For interactions, that times are rounded to 8 ms and anything under 16 ms
  is not reported. For both, "N more happened before this list started keeping them" when the
  store's dropped count is not zero.
- With no rows: the idle state without the startup line when paused. Otherwise the list's empty
  text, which for long tasks and interactions differs when the device cannot report them.

### What the wire allows, and what that forces

**Nothing measures.** The device's chart and its tick column size themselves with `onLayout`,
which never fires in the tab. The chart is drawn at a fixed `viewBox` and stretched by CSS instead,
so it fits any width without being told one.

**SVG cannot cross.** The tab page builds its nodes with `createElement`, which cannot make an SVG
element. So a chart is an `<img>` whose `src` is a data URL of an SVG string: a `polyline` per
series, `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke`, so the line stays
thin when the image is stretched. The page already allows `data:` images, since the network
Preview tab draws them. Gridlines, ticks and the x axis are plain `div`s around it. A colour inside
the image cannot read a CSS variable, so the chart takes real colours from the palette.

**A `FlatList` cannot cross** (see `react-native-devtools.md`). The lists are a `table`. Each keeps
`historySize` entries, 120 by default, so all of them render.

**Icons are masks, not `MaterialIcons`.** A `MaterialIcons` glyph draws as an empty box. The idle
badge is a red dot drawn in CSS. The user timing pin and ruler are Material's own `push_pin` and
`straighten` paths, drawn through the network sheet's `[data-icon]` mask.

**Folding is `<details>`.** Resources and Startup open to start with and fold in the page itself,
as the network Headers sections do. No state crosses for it.

**Only the active panel is mounted.** Switching to Network and back drops the chosen section and
the folds. Both are this surface's own business, like the selected row in network, so they stay in
`useState`. It also releases the tab's hold on the frame counter, which keeps counting if the
phone's Performance tab is still open.

## Order of work

1. **One frame counter.** Count users in `startFpsMonitor`, with one test: start twice, release
   once, and readings still arrive; release again, and the native counter stops once and the
   readings clear. Ends with the device's Performance tab working as it did.
2. **The shell.** Panel wired into `panels.const.tsx`, the toolbar with record, clear and the
   sections, the idle state. Ends with record in DevTools starting the phone's collectors and
   clear emptying both sides.
3. **The chart and the meter.** The SVG builder, with one test for the points: filled from the
   right against the capacity, and clamped to the top. Ends with a static series drawn right at any
   panel width.
4. **Resources.** FPS, Interactions, Memory and Storage cards, every caption above. Ends with the
   example app's Performance demo moving the charts, and a build without the native module showing
   each "dev build" line, and the phone and DevTools showing the same frame rate side by side.
5. **Startup.** Both blocks and their notes. Ends matching the device's numbers on a dev build and
   in Expo Go.
6. **The lists.** The three tables, the notes above them, the empty texts, the idle state when
   paused. Ends with the demo's long task, slow tap and mark buttons each adding a row on both
   sides.
7. **Theme.** Palette colours as CSS variables on the panel's root, real colours into the charts.
   Ends with every theme drawn right.
8. **Notes.** Tick Performance in `react-native-devtools.md`, move this plan to `logs/`.

## Not in this plan

- **Re-render and component timing.** The device does not have it yet (`performance.md`). Parity
  first. Once the device has it, the tab gets it in the same change.
- **Sorting the lists by column.** The device cannot either, and 120 rows newest first reads fine.
  Easy to add later, as the network table does.
- **Exporting a recording.** The device has no export for this tab.

## Open decisions

1. **Having the tab open costs the app frame rate.** The tab renders in the app, on the JS thread
   it is measuring, and the store notifies up to four times a second while recording. The JS FPS
   reading will drop a little when DevTools is watching. Either say so in a line under the FPS
   card, or say nothing, as the device does for its own panel. Recommend the line, since a number
   that changes with who is looking should say so.
2. **Sharing the toolbar CSS.** The record, clear and toggle buttons live in `NETWORK_PANEL_CSS`.
   Reusing them means this panel injects that sheet too, about 1,200 lines. Recommend reusing it
   now and moving the shared bar rules into their own sheet later, which touches `constants/` and
   the network panel, both owned by someone else.
