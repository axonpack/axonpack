# Crash reporting

The errors that end a session, or nearly do, turned into a report you can read on the device — and
the one subsystem here meant to survive into a release build.

## Features

- [x] Catches JS errors, unhandled promise rejections, render errors and native exceptions
- [x] Keeps working in a release build without turning the rest of the devtools on
- [x] A crash that killed the app is reported at the next launch
- [x] A plain notice for people using the app, the full sheet for developers
- [x] Report carries stack, component stack, breadcrumbs, device details and raw JSON
- [x] Copy as Markdown or JSON, or share the whole report
- [x] History of past reports with an unread count
- [x] Rewrite or drop a report before it is stored or handed on
- [x] Attach your own details — user, screen, feature flags — to every report
- [x] Error boundary that shows a Try again screen instead of a blank one
- [x] Optionally replace React Native's red box with the report sheet
- [x] A fatal JS error is reported without ending the app, the way it never ends one in development
- [ ] Send reports to a backend, with queueing and retry
- [ ] Group duplicate crashes instead of one row each
- [ ] Capture the current route automatically

## The four tiers

Which tier caught a crash decides how much it can say:

- **JS errors** — the global error handler, _wrapped_ rather than replaced. React Native installs
  its own at startup; calling the previous one afterwards is what keeps LogBox, the red box and RN's
  own native reporting alive.
- **Unhandled promise rejections** — the Hermes rejection tracker. This is the tier that adds most
  in a release build, because RN registers its own tracker only in development, so a rejection in
  production is otherwise silent. It is a single-slot API, so ours displaces RN's in development;
  re-emitting through `console.error` restores LogBox, which is a shallower path than importing RN's
  internals.
- **React render errors** — the exported error boundary. The only tier that produces a component
  stack, which is usually the half worth reading, and it turns a white screen into a Try again
  button.
- **Uncaught native exceptions** — the platform's uncaught-exception handler on each side, chained
  to whatever was installed before it.

## Decisions worth knowing

- **A fatal JS error does not end the app, and there is no switch for that.** React Native decides
  this by build: in development it hands the error to the red box and tells the native side nothing,
  and in a release build it reports it, which is what ends the process. The same error, the same
  fatality — only the branch differs. So a release build crashing on something development has always
  survived is a difference in reporting, not in severity, and this closes it: the error is captured,
  shown and not reported onward. Turning the `jsErrors` tier off hands the decision back to React
  Native.
- **A record for one is never written to disk.** Persisting exists so a crash can be reported at the
  next launch, where the sheet presents it as one the process did not survive. That is now true of a
  native exception and nothing else — the panel is alive to show every JavaScript record itself, and
  writing one down would report it a second time and describe it wrongly.
- **What survives is the process, not necessarily the state.** The JavaScript thread was interrupted
  part-way through, possibly mid-render, so component state, the native view tree and the app's own
  state may afterwards disagree — a screen that will not re-render, a queue that stopped draining, a
  write applied by half. This is why the report is put on screen rather than filed quietly: an app
  carrying on in a doubtful state is only safe to trust if whoever is looking at it knows it happened.
  A `DevtoolsErrorBoundary` around a subtree is the stronger tool where it fits, because unmounting
  that subtree actually discards the broken state instead of stepping over it.

- **It has the only gate that isn't `init()`.** Setting the flag installs the handlers when the
  client is _constructed_, so an app keeps its usual development-only `init()` call and still
  reports crashes from release. That is the consent `init()` would have given, and it buys earlier
  coverage: handlers installed at import catch what is thrown before `init()` would have run.
- **Before `init()`, only the native tier is installed.** The JS tiers report errors the app
  survived, which is a developer's concern, and the sheet there is in front of a user. A fatal JS
  error still arrives, because React Native turns it into a native exception on its way to killing
  the process.
- **A dying process is written from native, on the dying thread**, as JSON Lines into the app's own
  sandbox — Application Support on iOS rather than Caches, which the system may purge. It is drained
  at the next launch, which is also the proof the process died: a record still in the file outlived
  the run that wrote it. Persisting from native is also what keeps the no-storage-library rule
  intact.
- **Non-fatal records are not persisted.** The app survived them, and re-reporting one at the next
  launch would be a bug.
- **The sheet has two forms, and the wrong one in release is a real problem.** The full sheet is a
  debugging tool — tabs, a stack tree, raw JSON, this package's own logo. In front of somebody
  using the app that is a category error, so the compact notice is the default until `init()` has
  run.
- **Dismissing the notice retires the whole backlog**, not just the report on screen. A launch can
  drain a pile of records at once, and dismissing one used to put the next straight back up in the
  same sheet with nothing animating between them: the exit button read as dead. The records are all
  still in the store, unread, for the tab.
- **A stack is symbolicated by asking Metro, the way LogBox does.** A frame from a dev bundle names
  the bundle, not the file — `index.bundle:104857:23` — and the source map that turns it back into
  `CrashDemo.tsx:79:25` lives on the dev server. So the stack is POSTed to `/symbolicate`, whose
  answer also carries the `codeFrame` (source lines, `>` marker, caret) the Source section renders,
  and a `collapse` flag per frame that decides what hides behind "See N more frames". Three things
  about that response are only knowable by asking a real Metro, and all three were wrong on the first
  attempt: an unmappable frame is **echoed back** with its bundle URL and a null position rather than
  blanked, it carries `collapse: true` whatever it is (so honouring that would hide app frames), and
  a positionless frame like `native` round-trips as line `0`. All three now fall back to the raw
  frame. The `content` is ANSI-coloured for a terminal and is stripped here.
- **Two symbolication requests, not one, because Metro answers with one code frame per request** —
  the first mappable frame of whatever it was handed. So the error stack and the component stack go
  separately, which is what yields the second source: where it threw, and which element rendered it.
  The section is titled "Sources" only when both are there, and a component that threw in its own
  render is deduped by content down to one. React Native does exactly this
  (`LogBoxLog.handleSymbolicate`), and its `parseComponentStack` is now just its error-stack parser —
  React 19 writes component stacks in the `at Foo (bundle:1:2)` shape, not React 18's
  `in Foo (at Bar.tsx:12)`. Ours parses both; before that, every modern component-stack entry came out
  as one unparsed line, which also meant it had no location to symbolicate.
- **The dev server is found from the frames, not from `getDevServer`.** That avoids a deep,
  version-specific import into RN internals, and it is a tighter gate than `__DEV__`: nothing is
  contacted unless the trace itself came from an http origin, so a release build asks nobody. The
  request goes through the **unpatched** `fetch` (`core/utils/unpatched-fetch.util.ts`) — the panel's
  own traffic must not appear in its own Network tab, or be throttled by its own conditions.
- **A console error row opens the report for its own error.** Every uncaught JS error is reported
  twice by design — once as a crash record, once as a console row, because RN's `ExceptionsManager`
  re-emits through `console.error` specifically so that patched consoles see it. Rather than
  suppress one, the row links to the other: the _same_ `Error` object reaches both paths, so a
  `WeakMap` keyed on it (`core/stores/crash-link.store.ts`) gives an exact link with no timestamp or
  message matching, and weak keys mean the link dies with the error. Tapping the message opens the
  report **over the Console tab** — deliberately not a tab switch, which would cost the filters and
  scroll position — while the disclosure arrow still expands the inline stack. `core/` mounts the
  sheet and holds the selected id (`crash-inspection.store.ts`); the console side imports nothing
  from this feature.
- **Breadcrumbs cost almost nothing.** They are read from the console and network ring buffers that
  already exist, so nothing is recorded _for_ crash reporting.
- **Redaction runs before anything leaves the process** — the store, the disk and the consumer's
  hook all see the redacted record, so there is no ordering in which the raw one escapes.
- **Turning off RN's red box uninstalls LogBox** rather than muting it, because muting only hides
  the toasts and an uncaught error still opens a full-screen box. The yellow warnings go with it:
  LogBox is one component and the two cannot be separated.

## Won't do

- **Symbolicating a release bundle.** Dev symbolication exists (above); release does not. There is
  no dev server to ask, the bundle is minified and this package ships no source maps, so the frames
  point into the bundle. The Stack section says so.
- **Signal-level crashes.** Segfaults, `fatalError` and NDK crashes need an async-signal-safe
  handler that would fight Crashlytics, Sentry and Bugsnag over the same slot, and would yield
  unsymbolicated addresses anyway. Uncaught-exception handlers cover essentially every real React
  Native crash.
- **Hang and ANR detection.** A frozen main thread is a different mechanism from an exception.
- **Restarting the app from the notice.** iOS has no supported way for an app to relaunch or
  terminate itself, so a Restart button could only ever have worked on half the devices it shipped
  to.
