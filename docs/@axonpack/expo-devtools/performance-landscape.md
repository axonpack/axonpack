# Performance tooling landscape

A read of every performance-related project checked out under `examples/`, against what
`@axonpack/expo-devtools` (2.0.0) does today: what each one measures, how it measures it, whether that
needs native code, and where the gaps between them and us actually are.

Companion to [`react-native-performance-apis.md`](./react-native-performance-apis.md), which covers the
platform surface itself (RN 0.86 `private/webapis/performance`). This document is about the libraries
built on top of it.

## What was read

| Project                                                               | Version | Shape                                               | Native?                                   |
| --------------------------------------------------------------------- | ------- | --------------------------------------------------- | ----------------------------------------- |
| `examples/react-native-performance/packages/react-native-performance` | 6.0.0   | `Performance` API implementation + native marks     | Yes — ObjC++ (iOS), Java (Android)        |
| `examples/react-native-performance/packages/isomorphic-performance`   | 6.0.0   | Types-only shim for Node/Browser/RN parity          | No                                        |
| `examples/react-native-performance-stats`                             | 0.2.4   | Native sampling loop → JS event stream              | Yes — ObjC++ (iOS), Java (Android)        |
| `examples/react-native-performance-limiter`                           | 0.3.0   | Imperative "make it slow / crash it" API            | Partly — main-thread half only            |
| `examples/expo/packages/expo-observe`                                 | (repo)  | Production observability, dispatches to EAS Observe | Yes — Swift/Kotlin                        |
| `examples/expo/packages/expo-insights`                                | (repo)  | Startup events to EAS, no JS API at all             | Yes — Swift + ObjC++ (`ReactMarker`)      |
| `examples/expo/packages/expo-app-metrics`                             | (repo)  | Metric collection engine behind `expo-observe`      | Yes — but see the caveat below            |
| **`@axonpack/expo-devtools`**                                         | 2.0.0   | **In-app devtools panel**                           | **Optional Expo module (both platforms)** |

Caveat on `expo-app-metrics`: only its directory layout is present in this checkout (`ios/AppStartup`,
`ios/FrameRate`, `ios/Memory`, `ios/Network`, `ios/NetworkRequests`, `ios/Database`, `ios/Sessions`,
`ios/CrashReporting`, `ios/Storage`, `ios/Updates`, `ios/LogEvents`) — every file is missing. Claims about
it below are read off those names and off `expo-observe`'s TypeScript types, not off its source.

`examples/react-native-network-logger`, `examples/react-native-logs` and `examples/drizzle-orm` are not
performance projects and are out of scope here.

## The one-line summary of each

- **`react-native-performance`** — the standards-compliant timeline. It gives you `performance.mark`,
  `measure`, `metric`, a `PerformanceObserver`, and ~35 **native startup marks** covering the RN bootstrap
  phase by phase. It renders nothing; you read the entries yourself or point Rozenite's performance plugin
  at them.
- **`react-native-performance-stats`** — the Perf Monitor as a data stream. Deliberately a re-implementation
  of RN's own dev overlay: JS FPS, UI FPS, RAM, CPU, dropped frames, stutters, view counts, pushed to JS
  every 500ms–1s. Unmaintained and deprecated by its author.
- **`react-native-performance-limiter`** — four functions that block or crash the JS thread and the native
  main thread, so you can prove your monitoring and crash reporting actually fire.
- **`expo-observe` / `expo-app-metrics` / `expo-insights`** — not devtools. Production telemetry: collect
  natively, persist locally, sample per install, dispatch to EAS. You read the numbers on a dashboard days
  later, not in the app.
- **`@axonpack/expo-devtools`** — an in-app panel. It is the only one of the five that renders anything, and
  the only one that bundles collection, history, charts, and the limiter into a single surface.

## Capability matrix

`JS` = pure JavaScript, `native` = requires native code, `—` = not provided.

| Capability                                | expo-devtools (us)         | react-native-performance        | performance-stats            | limiter | expo-observe               |
| ----------------------------------------- | -------------------------- | ------------------------------- | ---------------------------- | ------- | -------------------------- |
| JS-thread FPS                             | JS (rAF)                   | —                               | native                       | —       | native (frameRate)         |
| UI/main-thread FPS                        | native                     | —                               | native                       | —       | native                     |
| Dropped frames / stutter count            | —                          | —                               | native (Android)             | —       | native                     |
| CPU usage                                 | —                          | —                               | native                       | —       | ?                          |
| JS heap (used/total)                      | JS (`performance.memory`)  | —                               | —                            | —       | —                          |
| App memory footprint (RSS/PSS)            | native                     | —                               | native                       | —       | native (`Memory/`)         |
| Device total / available RAM              | native                     | —                               | native (avail. via RAM only) | —       | ?                          |
| Storage total / free                      | native (Android only)      | —                               | —                            | —       | native (`Storage/`)        |
| View count / visible view count           | —                          | —                               | native (iOS only)            | —       | —                          |
| Startup: RN platform markers              | JS (`rnStartupTiming`)     | native (own marks)              | —                            | —       | native                     |
| Startup: process start                    | native                     | native                          | —                            | —       | native                     |
| Startup: per-phase RN bootstrap breakdown | —                          | native (~35 marks)              | —                            | —       | native                     |
| Time to interactive / first render        | JS (overlay mount)         | native (`contentAppeared`)      | —                            | —       | native + `markInteractive` |
| Long tasks                                | JS (`PerformanceObserver`) | JS (observer, no native source) | —                            | —       | —                          |
| Interaction latency (Event Timing)        | JS                         | JS (if native emits)            | —                            | —       | native (TTI/TTR)           |
| User timing (`mark`/`measure`)            | JS (recorded + forwarded)  | JS (full spec impl)             | —                            | —       | `logEvent`                 |
| Custom numeric metrics (`metric()`)       | —                          | JS + native APIs                | —                            | —       | native counters            |
| Marks emitted **from native app code**    | —                          | native (ObjC/Java API)          | —                            | —       | —                          |
| Network / resource timing entries         | — (separate Network tab)   | JS (XHR patch)                  | —                            | —       | native (`Network/`)        |
| JS bundle size                            | —                          | native (iOS metric)             | —                            | —       | —                          |
| Block / crash JS thread                   | JS                         | —                               | —                            | JS      | —                          |
| Block / crash main thread                 | native                     | —                               | —                            | native  | —                          |
| In-app UI, charts, history                | **yes**                    | —                               | —                            | —       | —                          |
| Pause / resume recording                  | yes                        | (resource logging toggle)       | start/stop                   | n/a     | `dispatchingEnabled`       |
| Ship-to-backend / sampling                | —                          | —                               | —                            | —       | **yes**                    |
| Works on web / Node                       | —                          | yes (`isomorphic-performance`)  | —                            | —       | partial                    |
| React `Profiler` integration example      | —                          | yes                             | —                            | —       | yes (router/nav)           |

## Same problem, different solution

### Startup timing

**Them (`react-native-performance`).** Native marks are the whole point. On iOS `RNPerformanceManager`
listens for `RCTContentDidAppearNotification` / `RCTJavaScriptDidLoadNotification`, then emits from
`ReactMarker::StartupLogger` — `nativeLaunchStart/End`, `runJsBundleStart/End`, `appStartupStart/End`,
`initReactRuntimeStart/End`, `contentAppeared` — plus a `bundleSize` metric read from
`self.bridge.performanceLogger`. On Android `PerformanceModule` registers a `ReactMarker.MarkerListener`
**before** the module is initialized and buffers everything until content appears, which yields ~25 extra
Android-only phases (`vmInit`, `createReactContextStart`, `buildNativeModuleRegistryEnd`, …). Process start
comes from a `ContentProvider` (`StartTimeProvider`) that runs before `Application.onCreate` and computes
`uptimeMillis() - Process.getElapsedCpuTime()`.

**Us.** We read `performance.rnStartupTiming` (four nullable fields) and add our own native
`getStartupTimestamps` — `sysctl` `kinfo_proc.p_starttime` on iOS, `Process.getStartUptimeMillis()` on
Android — then stitch in three JS-side stamps: module evaluation, `init()`, and first overlay mount. The UI
labels these as phases ("Native startup", "Bundle eval", "App setup", "To first render") rather than
claiming platform milestones, because that's what they honestly are.

**Difference that matters.** Their breakdown is finer and platform-truthful; ours is coarser but always
produces a total a user recognises, and it still works when the platform reports all nulls. They pay for it
with a `ReactMarker` listener registered ahead of module init and, on iOS, a `self.bridge` dependency.

### Frame rate

**Them (`performance-stats`).** Both figures come from native. iOS runs one `CADisplayLink` on the main
runloop and a second one dispatched onto `RCTJSThread`'s runloop — an FPS tracker copied from
`RCTFPSGraph`. Android uses RN's own internal `FpsDebugFrameCallback` (the class behind `FpsView`), which
also hands out `getExpectedNumFrames()`, `getNumFrames()` and `get4PlusFrameStutters()`, so dropped frames
and stutters come free. A 500ms `Handler` loop packages it up and emits.

**Us.** JS FPS is a `requestAnimationFrame` counter published from a `setInterval` window, with a
`MIN_WINDOW_MS` guard because an early-firing interval after a JS stall produced readings like 1005fps.
Main-thread FPS is our own native tracker — `CADisplayLink` on `.main`, `Choreographer` on the main looper —
holding a 500ms window that JS polls on the same schedule, with `-1` as the "no window closed yet" sentinel
so "unmeasured" stays distinct from a real zero. The loop is owned by the view, not the collector service,
because it keeps the JS thread awake for as long as it lives.

**Difference that matters.** Their JS-thread number is more honest than ours: a display link on the JS
runloop keeps counting shape that a rAF loop inside a stalled JS thread cannot report. But they have no
history and no UI — you get an event per window and store it yourself. We chart it and label the JS/main
gap as the reading. They also get dropped-frame and stutter counters we simply don't have.

### Memory

**Them.** `performance-stats` reports one number: `RCTGetResidentMemorySize()` on iOS,
`Debug.getMemoryInfo().totalPss` on Android, both in MB, and its README is candid that Android's excludes
graphics memory. `react-native-performance` reports no memory at all.

**Us.** Two independent numbers, deliberately: the JS heap from Hermes via `performance.memory` (a
_throwing_ getter on JSC/V8, so even the probe is inside a `try`), and the app footprint from our native
module — `task_vm_info.phys_footprint` on iOS (the figure Xcode's gauge shows), `totalPss` on Android. Plus
device total RAM, plus available-to-app (`os_proc_available_memory()` / `MemoryInfo.availMem`), plus storage
on Android. Hermes reports no `jsHeapSizeLimit`, so there is deliberately no "% of limit" gauge.

**Difference that matters.** We're ahead here. Nobody else separates "the JS heap" from "what the OS holds
against you", which is the distinction that stops people from misreading a 6MB Hermes heap as the app's
footprint. Note the one asymmetry we accepted on purpose: iOS reports no storage, because
`FileManager.attributesOfFileSystem` is a required-reason API and shipping it would push a
`PrivacyInfo.xcprivacy` obligation onto every consuming app for a number that isn't about performance.

### CPU

**Them (`performance-stats`).** iOS walks the task's thread list (`task_threads` +
`thread_info(THREAD_BASIC_INFO)`) and sums `cpu_usage / TH_USAGE_SCALE`. Android shells out to
`Runtime.exec("top -n 1 -q -oCMDLINE,%CPU -s2 -b")` and greps for its own package name. Off by default,
because it costs enough to distort what it measures.

**Us.** Nothing. This is the clearest single capability gap.

### Jank and long tasks

**Them.** `react-native-performance` ships a spec-complete `PerformanceObserver` of its own (Performance
Timeline Level 2 + User Timing Level 3, with a real test suite covering `buffered`, `takeRecords`,
`disconnect`, sorting), but no native source of `longtask` entries — so long tasks only appear if the
platform emits them. `performance-stats` approaches jank from the opposite end: it doesn't report tasks, it
reports the frames those tasks cost.

**Us.** RN's own `PerformanceObserver` on `'longtask'`, gated on `supportedEntryTypes`, observed with
`buffered: true` so startup tasks survive until the panel opens, filtered at 50ms **in JS** (Long Tasks
fixes its threshold at 50ms; `durationThreshold` belongs to Event Timing and is ignored here), plus
`droppedEntriesCount` surfaced in the UI. And `'event'` entries for interaction latency, with the threshold
clamped to ≥16ms because the spec clamps it anyway, splitting event-to-paint `duration` from handler
`processingDuration` so you can tell your handler from the queue in front of it.

**Difference that matters.** Interaction latency is ours alone among these libraries. Frame-cost accounting
is theirs alone.

### User timing

**Them.** `react-native-performance` _is_ the User Timing implementation: full `mark`/`measure` with
`detail`, `getEntriesByType`, an observer, plus a `metric()` extension for non-time values, plus native
`RNPerformance.sharedInstance.mark:` / `RNPerformance.getInstance().mark()` so native app code can put its
own marks on the same timeline (with an `ephemeral` flag controlling survival across bridge reloads). The
example app wires `React.Profiler`'s `onRender` straight into `performance.measure`.

**Us.** W3C-shaped `mark`/`measure`/`clearMarks`/`clearMeasures` on the client, recorded into our store
**and** forwarded onto the platform `performance` object. We deliberately do not _observe_ mark/measure:
that also delivers React's internal track measures — hundreds of sub-millisecond entries whose names change
between React versions — and it fed a render loop, because the panel re-rendering is itself work React
measures.

**Difference that matters.** Their surface is wider (`detail` survives, `metric()` exists, native code can
contribute marks). Ours is narrower by choice and renders what it records. The React `Profiler` recipe
costs us nothing to document and we don't.

### Making things slow on purpose

**Them (`limiter`).** `blockJavascriptThread` busy-waits in JS; `crashJavascriptThread` throws.
`blockNativeMainThread` / `crashNativeMainThread` are a TurboModule (old-arch and new-arch shims,
`__turboModuleProxy` sniffing, a `Proxy` that throws a linking error if unlinked): `dispatch_async` onto the
main queue and spin / `NSException raise`, or `Handler(Looper.getMainLooper()).post` and spin /
`RuntimeException`. Both native calls return a Promise, so you can `await` the unblock.

**Us.** The same four operations, same techniques, reached through the Limiter panel with duration presets
instead of a code call — and as an Expo module via `requireOptionalNativeModule`, so an app in Expo Go keeps
everything and just loses the two main-thread buttons instead of throwing a linking error.

**Difference that matters.** Ours is a superset in reach and degradation, with one omission: their
main-thread block resolves a promise when the block ends; ours is fire-and-forget, so JS can't sequence work
after the freeze.

### Getting the data somewhere

This is the real axis these projects differ on, more than any metric.

- `react-native-performance` → **you** read the timeline (`getEntriesByType`, an observer), or Rozenite's
  plugin does over the dev connection.
- `performance-stats` → an event stream; `addListener` and keep what you want.
- `expo-observe` → collected natively, persisted locally (its `ios/Database`, `ios/Sessions` layout), sampled
  deterministically per install (`sampleRate`, stable across launches), gated by `dispatchingEnabled` /
  `dispatchInDebug`, exported over OpenTelemetry to EAS. Route-level metrics come from `expo-router` /
  `@react-navigation/native` integrations recording `cold_ttr`, `warm_ttr` and `tti`, with a
  `markInteractive` / `ObserveInteractiveMarker` escape hatch for "interactive" meaning something app-specific.
  `expo-insights` is the minimal ancestor of this: `src/index.ts` is literally `export default {}` — all of
  it is native, reading `ReactMarker::StartupLogger` and `RCTContentDidAppearNotification`.
- **Us** → an in-app panel. Ring-buffered history, `historySize`, downsampled charts, record/pause that
  attaches and detaches collectors rather than filtering after the fact, and `support` flags so an
  unsupported metric says "needs a development build" instead of showing a dash that looks like "not measured
  yet".

Nobody in `examples/` competes with us on the panel. Nobody but Expo competes on production telemetry, and we
aren't trying to.

## What they have that we don't

Ordered by value-per-effort, with what it would actually take.

1. **CPU usage** — native both platforms. iOS: thread walk (`task_threads` + `thread_info`). Android: the
   `top` shell-out is ugly and slow; `/proc/self/stat` deltas are the better version of it. Off-by-default
   like theirs, since the measurement distorts the measurement. Fits our existing native module and sampling
   interval with no new architecture.
2. **Dropped frames and 4+ frame stutters** — Android nearly free: our `Choreographer` tracker already has
   the frame timestamps, so expected-vs-actual frame counts and long-gap counts are arithmetic we're
   throwing away. iOS the same from `CADisplayLink.targetTimestamp`. "You dropped 47 frames" lands harder
   than a 52fps average.
3. **JS-thread FPS measured on the JS thread's runloop** — the iOS trick from `performance-stats` (a
   `CADisplayLink` dispatched onto `RCTJSThread`) reports through stalls that silence our rAF loop. Needs a
   JS-thread handle, which is bridge-flavoured API; worth checking what's reachable bridgeless before
   committing.
4. **`resource` entries** — already noted in `react-native-performance-apis.md` as unused. `react-native-performance`
   fakes them with an XHR patch, which is exactly the trap our own CLAUDE.md documents: Expo's native fetch
   doesn't route through XHR, so their resource logging misses it entirely. If RN's `supportedEntryTypes`
   includes `'resource'` on device, we'd get real transport timing the Network tab currently has to admit it
   can't measure — and we'd get it for fetch too.
5. **A `metric()`-style custom numeric entry** — pure JS, small, and it makes the User Timing API useful for
   things that aren't durations (cache hit rate, item counts, payload sizes).
6. **`performance.eventCounts` as a denominator** — free, no observer. Turns "3 slow interactions" into "3
   slow taps out of 214".
7. **Native-side marks API** — letting an app's own Swift/Kotlin contribute to the timeline (their
   `RNPerformance.sharedInstance.mark:`). Real value for anyone with native modules of their own, but it's a
   new public native surface to design and support.
8. **Per-phase RN bootstrap breakdown** — their Android mark list is enviable, and it comes from
   `ReactMarker.MarkerListener` registered before module init. Expensive: it means shipping a listener that
   has to run earlier than our module does, and it duplicates what `rnStartupTiming` is supposed to give us.
9. **React `Profiler` recipe** — not code, documentation. Their example wires `onRender` into `measure` in
   about six lines; our `mark`/`measure` already supports it and nothing says so.
10. **Web/isomorphic story** — `isomorphic-performance` exists because their consumers ship to web too. Not
    our problem while the panel is RN-only.

Explicitly not worth chasing: production dispatch, sampling, and a backend (that's EAS Observe's job, and
ours is a dev-time panel); view-count metrics (`performance-stats` reads them through
`self.bridge.uiManager valueForKey:@"viewRegistry"` — private API on a bridge that may not exist).

## What we have that none of them do

- An actual **UI**: charts with history, collapsible sections, sortable entry lists, an idle state, honest
  "unsupported on this build" messaging driven by capability flags.
- **JS heap and app footprint as separate readings**, with the reason they differ made visible.
- **Interaction latency** with the handler-vs-queue split (Event Timing).
- **Device context** — total RAM, memory available to the app before the OS kills it, free storage.
- **Graceful degradation by construction** — `requireOptionalNativeModule` means Expo Go loses exactly the
  native-only readings and nothing else; every competitor either throws a linking error or is native-only.
- **Collector lifecycle tied to the record button**, which fixed a real bug (an observer attached while paused
  delivered nothing after resume) and re-reads buffered native entries on each resume.
- **The limiter in the same panel as the measurements it's meant to disturb** — the two libraries that cover
  these separately can't demonstrate one with the other.
- **Tests.** `react-native-performance` has a good observer suite; `performance-stats` and the limiter have
  next to nothing. Ours cover the collectors, the store, and the utils.

## Bridge-era caveats worth noting

Both measurement libraries lean on APIs that predate bridgeless RN, which is a maintenance signal as much as
a technical one:

- `performance-stats` reads `self.bridge.uiManager` via `valueForKey:@"viewRegistry"` and dispatches onto
  `RCTJSThread` through `self.bridge`. It is also **unmaintained and deprecated** by its author, in favour of
  `react-native-performance-toolkit` (not checked out here).
- `react-native-performance` reads `self.bridge.performanceLogger` for `bundleSize` and sniffs
  `global.RN$Bridgeless` / `global.__turboModuleProxy` to pick a module path.
- Both hand-roll old-arch/new-arch module shims. Our Expo module gets that from Expo Modules autolinking, and
  `requireOptionalNativeModule` gives us the absent-module case for free — which is why our Expo Go story is
  a paragraph and theirs is a thrown error.

## Related

- [`react-native-performance-apis.md`](./react-native-performance-apis.md) — the RN 0.86 platform surface
- [`../../../packages/@axonpack/expo-devtools/ROADMAP.md`](../../../packages/@axonpack/expo-devtools/ROADMAP.md)
- [Rozenite performance monitor plugin](https://www.rozenite.dev/docs/official-plugins/performance-monitor) —
  what `react-native-performance` pairs with now that Flipper is gone
