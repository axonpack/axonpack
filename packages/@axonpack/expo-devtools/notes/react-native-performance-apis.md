# React Native's performance web APIs

Reference notes on what React Native actually ships under
`node_modules/react-native/src/private/webapis/performance/`, read from RN **0.86.0** as installed in
`packages/@axonpack/expo-devtools/example`. This is the entire surface the Performance tab is built on,
so it's also the ceiling on what that tab can ever show without native code of our own.

`private/` in the path is not decoration — these are RN internals, not a public export. Everything below
is reached through the `performance` / `PerformanceObserver` globals, never by importing these files.

## How the whole thing is wired

Every file here is a thin JS shell over one C++ TurboModule:

```
specs/NativePerformance.js
  → TurboModuleRegistry.get<Spec>('NativePerformanceCxx')
```

It's fetched with `get`, not `getEnforcing`, so **the module can be absent** — every JS wrapper has to
cope with `NativePerformance == null`. That's why `internals/Utilities.js` ends with a three-step
fallback for the clock:

```js
export const getCurrentTimeStamp =
  NativePerformance?.now ?? global.nativePerformanceNow ?? (() => Date.now());
```

Native hands JS plain structs, not class instances. `internals/RawPerformanceEntry.js` maps them, keyed
by a numeric enum (`MARK: 1`, `MEASURE: 2`, `EVENT: 3`, `LONGTASK: 4`, `RESOURCE: 5`), into the public
classes. Two consequences we rely on:

- An entry only carries the fields native chose to send. `detail` on marks and measures does **not**
  survive the trip, which is why observing user timing can never recover the payload a caller passed.
- New entry types need work on both sides. `PerformanceObserver.supportedEntryTypes` comes from
  `getSupportedPerformanceEntryTypes()`, i.e. it reports what this platform's native build implements —
  which is why it varies by platform and RN version and must be checked at runtime.

## File by file

| File                               | What it provides                        | How                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `specs/NativePerformance.js`       | The TurboModule contract                | ~20 methods: `now`, `timeOrigin`, `reportMark`, `reportMeasure`, `getMarkTime`, `clearMarks`, `clearMeasures`, `getEntries`, `getEntriesByName`, `getEntriesByType`, `getEventCounts`, `getSimpleMemoryInfo`, `getReactNativeStartupTiming`, `createObserver`, `observe`, `disconnect`, `takeRecords`, `getDroppedEntriesCount`, `getSupportedPerformanceEntryTypes` |
| `Performance.js`                   | The `performance` global                | Getters `eventCounts`, `memory`, `rnStartupTiming`, `timeOrigin`; methods `mark`, `measure`, `clearMarks`, `clearMeasures`, `getEntries`, `getEntriesByType`, `getEntriesByName`                                                                                                                                                                                     |
| `PerformanceObserver.js`           | `PerformanceObserver`                   | `createObserver` gets a native handle; `observe` forwards either `{entryTypes}` or `{type, buffered, durationThreshold}`; the native callback pulls entries with `takeRecords(handle, true)` (sorted) and maps them                                                                                                                                                  |
| `PerformanceEntry.js`              | Base class                              | `name`, `entryType`, `startTime`, `duration`, `toJSON()`                                                                                                                                                                                                                                                                                                             |
| `UserTiming.js`                    | `PerformanceMark`, `PerformanceMeasure` | Marks force `duration: 0`; both keep `detail` **JS-side only**                                                                                                                                                                                                                                                                                                       |
| `LongTasks.js`                     | `PerformanceLongTaskTiming`             | `entryType: 'longtask'`; `TaskAttributionTiming` class exists but `attribution` returns a frozen `[]` constant                                                                                                                                                                                                                                                       |
| `EventTiming.js`                   | `PerformanceEventTiming`, `EventCounts` | Adds `processingStart`, `processingEnd`, `interactionId`; `EventCounts` is a Map-like read-through to `getEventCounts()`                                                                                                                                                                                                                                             |
| `ResourceTiming.js`                | `PerformanceResourceTiming`             | `fetchStart`, `requestStart`, `connectStart`, `connectEnd`, `responseStart`, `responseEnd`, `responseStatus`, `contentType`, `encodedBodySize`, `decodedBodySize`                                                                                                                                                                                                    |
| `MemoryInfo.js`                    | `performance.memory` shape              | `usedJSHeapSize`, `totalJSHeapSize`, `jsHeapSizeLimit` — all nullable                                                                                                                                                                                                                                                                                                |
| `ReactNativeStartupTiming.js`      | `performance.rnStartupTiming`           | Four nullable fields: `startTime`, `endTime`, `initializeRuntimeStart`, `executeJavaScriptBundleEntryPointStart`                                                                                                                                                                                                                                                     |
| `internals/RawPerformanceEntry.js` | Native struct → class mapping           | Numeric `entryType` enum, one `case` per type                                                                                                                                                                                                                                                                                                                        |
| `internals/Utilities.js`           | Clock and the missing-module warning    | `getCurrentTimeStamp`, `warnNoNativePerformance`                                                                                                                                                                                                                                                                                                                     |
| `UserTimingExtensibility.js.flow`  | Types only                              | A `.flow` declaration file; no runtime code                                                                                                                                                                                                                                                                                                                          |

## Things that caught us out

**`performance.memory` is a throwing getter, not a missing property.** `Performance.js` reads
`getSimpleMemoryInfo()` and branches on whether the result has `hermes_heapSize`. On a runtime with no
implementation the getter raises, so even a capability probe like `if (!performance.memory)` has to sit
inside a `try`. Hermes also reports **no** `jsHeapSizeLimit`, so any "% of limit" gauge would have to
invent its denominator.

**`durationThreshold` is forwarded for any single `type`, including `longtask`.** RN passes it straight
through to native (`PerformanceObserver.js`, in the `options.type` branch), but the W3C specs only define
it for Event Timing — Long Tasks fixes its threshold at 50 ms and says observers cannot configure it. So
whether a long-task threshold does anything is a native implementation detail, not a contract. We filter
long tasks in JS instead, and treat 50 ms as a floor.

**`droppedEntriesCount` arrives once per observer, not once per callback.** The native callback in
`PerformanceObserver.js` is guarded by `#calledAtLeastOnce`, so the count is read on the **first**
delivery and reported as `0` forever after. Anything accumulating it will see at most one non-zero value
per `observe()` — which is another reason our collectors re-attach on resume rather than staying live.

**`attribution` is permanently empty.** `LongTasks.js` returns a shared frozen array. The spec's
attribution mechanism is frame-oriented (`containerType` of `iframe`/`embed`/`object`/`frame`/`window`),
which has no meaning in React Native, so a long task can report duration but never a culprit.

**Startup markers depend on native calling `ReactMarker.setAppStartTime`.** All four fields are nullable
and many setups never populate them, so absent is the normal case, not an error.

## What we use, and what's left

Used by the Performance tab today: `PerformanceObserver` (`longtask`, `event`), `performance.memory`,
`performance.rnStartupTiming`, and `performance.mark`/`measure` — the last one written to, never observed,
because observing also delivers React's internal track measures.

Not used, and worth knowing about:

- **`resource` entries are fully plumbed.** `RawPerformanceEntry.js` constructs a complete
  `PerformanceResourceTiming` with connect/request/response timestamps and body sizes. If the native side
  emits them for app requests, that is a genuine transport-level timing breakdown — precisely what the
  Network tab's Timing panel currently has to say it cannot measure. Gated on `supportedEntryTypes`
  including `'resource'`, which needs checking on device.
- **`performance.eventCounts`** gives totals per event type, cheaply, without an observer — useful as a
  denominator for "3 slow taps out of 214".
- **`getEntriesByType()`** reads the native buffer directly, no observer needed. We removed our use of it
  because it returned React's measures, but it stays the way to recover entries that predate a collector.
- **`timeOrigin`** would let entry `startTime` values be converted to wall-clock properly, instead of the
  wall-clock stamp we record at insert time.

## Related

- [the feature list](./README.md) — the WebView resource-timing idea
- W3C specs: [Performance Timeline](https://www.w3.org/TR/performance-timeline/),
  [User Timing](https://www.w3.org/TR/user-timing/), [Event Timing](https://www.w3.org/TR/event-timing/),
  [Long Tasks](https://w3c.github.io/longtasks/)
