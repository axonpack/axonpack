# Crash reporting

Added crash capture, a Crashes tab, and a report sheet to `@axonpack/expo-devtools`.

## What was built

- `stores/crash/crash.store.ts` — ring buffer of `CrashRecord`, `enabled` gate, no `paused` flag,
  per-record `seen` driving the popup and the tab badge.
- `services/crash/` — `capture-crash` (record assembly, redaction, persistence decision,
  re-entrancy guard), `install-crash-handlers` (ErrorUtils chain, Hermes rejection tracker, native
  install, previous-launch drain), `native-crash` (optional native module wrapper),
  `device-info`, `collect-breadcrumbs`, `crash-popup`, `disable-logbox`.
- `utils/crash/` — `format-crash-report` (Markdown/JSON), `export-crash-report` (share sheet),
  `crash-menu-items`, `parse-stack` (V8 + JavaScriptCore frame shapes, React component stacks).
- `components/crash/` — `crash-view` (tab), `crash-row`, `crash-detail/` (Summary / Stack /
  Breadcrumbs / Device / Raw), `crash-report-overlay` (standalone popup, self-deduplicating),
  `devtools-error-boundary`.
- Native: `installCrashHandler` / `drainPendingCrashes` / `persistCrashRecord` / `getDeviceInfo` on
  both `AxonpackDevtoolsModule.swift` and `AxonpackDevtoolsModule.kt`, writing JSON Lines to
  Application Support (iOS) and `filesDir` (Android).
- Client: `crash` config section, top-level `enabled`, `setCrashContext`, `crashStore` on the
  returned client.
- Example app: `components/CrashDemo.tsx` plus a `crash` config block in `devtools.ts`.

## Decisions worth remembering

- **`crash.enableWhileDevtoolsDisabled` rather than a second init entry point.** `init()` stays the
  one call; it runs crash capture first, then returns early when `enabled` is false. Lets a release
  build call `init()` unconditionally and ship only the handlers.
- **Uncaught exception handlers, not POSIX signal handlers.** Async-signal-safety plus the conflict
  with Crashlytics/Sentry/Bugsnag over the same slot isn't worth the extra coverage. Documented as a
  hard limit rather than implied.
- **Persist from native, not JS.** A dying process gives JS no turn, and it keeps the "no storage
  library dependency" rule intact.
- **Only fatal records are persisted.** The app survived a non-fatal one, so re-reporting it at the
  next launch would be a bug. `persistNonFatal` opts in.
- **Rejection tracker re-emits through `console.error` in dev** to keep LogBox alive, rather than
  deep-importing RN's `ExceptionsManager`.
- **`disableDefaultLogBox` calls `LogBox.uninstall()`, not `ignoreAllLogs()`.** Muting only hides the
  toasts — RN's own comment says an uncaught error still opens the full-screen red box. `uninstall()`
  clears the `isInstalled` flag gating `addException`, which is what stops it. Cost: the yellow
  warning toasts go too, since LogBox is one component. Warns once if paired with `showPopup: false`,
  which would leave errors surfacing nowhere on screen.
- **Breadcrumbs default off outside `__DEV__`** — request URLs and log lines are a different privacy
  proposition from a stack trace.

## Verification

- 46 new tests (crash store, capture service, handler installation, LogBox disable, stack parsing,
  report formatting). Full suite: 27 suites / 243 tests passing.
- `oxlint` and `tsc --noEmit` clean for both the package and the example app.
- Not run on a device — native handlers are compile-checked by inspection only.

## Follow-up

Native log streaming (logcat / iOS stderr + OSLogStore) was scoped alongside this and deferred; the
decision was to surface it as a `source` inside the Console tab rather than a tab of its own.
