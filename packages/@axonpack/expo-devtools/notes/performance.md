# Performance

Frame rate, memory, startup and the moments the app stalled — measured on the device, with the tab
stating its own limits rather than faking past them.

Two companion notes cover the ground underneath this one:
[what the platform exposes](./react-native-performance-apis.md) and
[what other tools do with it](./performance-landscape.md).

## Features

- [x] Startup timing, including where the platform reports nothing
- [x] JS frame rate, and the main thread's frame rate on a dev build
- [x] JS heap over time
- [x] App and device memory
- [x] Disk space used and free
- [x] Long tasks
- [x] Slow interactions
- [x] Your own marks and measures
- [x] Pause and resume recording
- [ ] Renders per screen, counted and timed, through a layout you hand each navigator

## Decisions worth knowing

- **Collectors attach and detach with the record button**, rather than staying attached and
  filtering on the way in. This is load-bearing, not tidiness: an observer registered while
  recording was paused delivered nothing after recording resumed, so starting paused and then
  pressing record produced a permanently empty list. Re-attaching also re-reads the platform's
  buffered entries.
- **Startup timing is exempt from that** — a one-shot read of markers that never change, so it runs
  whether or not recording is on.
- **Memory is sampled on an interval, not continuously.** Every read crosses into the JS engine, so
  a fast interval would make the profiler the slowdown it is measuring. On engines with no
  implementation the property is a _throwing_ getter, so even the capability probe sits inside a
  `try`.
- **Long tasks are observed with buffering on**, because the interesting ones happen during startup
  and are long gone by the time the panel opens.
- **The frame-rate loop is started by the view, not the collector service.** It keeps the JS thread
  awake for as long as it lives, which is also why this is the one tab not kept mounted behind a
  hidden tab: the others stay mounted to preserve filters and scroll position, which here would mean
  a permanent animation-frame loop.
- **Main-thread frame rate comes from native.** A JS loop cannot see UI-thread jank at all — the UI
  can be fully stalled while JavaScript keeps ticking, which is the blind spot the card warns about.
- **Startup uses the real process start time from native**, because every clock reachable from JS
  starts long after the process did, and the platform's own startup markers are all nullable — it
  only fills them if its native code chose to.
- **Renders are counted per screen, by a layout the app passes to each navigator.** Both routers
  accept a screen layout on every navigator and call it once per screen, so a wrapper we ship puts
  React's own profiler around the screen and reports each commit with its phase and duration.
  That is a public API and one line per navigator, which is also the limit: a navigator without
  the line is a hole, and the tab says which screens it has never seen render. The count is
  commits that touched the screen's subtree, not renders of one component, so a child
  re-rendering counts. That is the number people ask about, and the tab names it as such. The
  profiler reports only in a development build, which the gate already assumes.

## Won't do

- **Heap snapshots and flame charts.** Both come from the debugger protocol over the inspector
  socket, not from anything the app can reach in itself.
- **A percentage-of-limit gauge.** Hermes reports no heap limit, and a JS heap number is not app
  memory anyway — the native reading beside it is.
- **Disk space on iOS.** The call for it is a required-reason API, which would oblige every app
  embedding this package to file a privacy declaration, for a number that is not about performance.
- **Per-component render counts, and why a component rendered.** React Native DevTools ships
  both in its Profiler and Components panels. Getting them here would mean wrapping the React
  DevTools hook and walking the fiber tree on every commit, against internals that move between
  React versions, to reproduce a panel that already sits beside ours.
