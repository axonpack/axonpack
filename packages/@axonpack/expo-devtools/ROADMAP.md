# @axonpack/expo-devtools — what's possible

Scope: this package specifically. For the wider `@axonpack/*` family (lite-storage, api-kit, i18n), see `docs/plan.md` at the repo root.

## Implemented today

- `createDevtoolsClient({ network, console })` — factory, not a Provider/Context. `.init()` installs the patches.
- `DevtoolsOverlay` — the on-device entry point: a draggable FAB that opens a full-screen modal with a compact **Network / Console** tab bar under its header. Both tabs stay mounted while the modal is open (the inactive one is `display: 'none'`) so switching doesn't wipe the filters and scroll position on the other. The Console tab carries a red badge with its error count while you're on another tab.
- **Prod-safe by default**: `networkLogStore` starts disabled and stays that way until `.init()` actually runs, so an app that skips calling `init()` in production captures nothing — no patched `fetch`/XHR, no store writes, and the WebView injected script itself becomes a no-op (`getWebViewInjectedJavaScriptBeforeContentLoaded` checks `isEnabled()` at generation time, so a disabled WebView page's `fetch`/XHR are never even patched, not patched-then-dropped). `createDevtoolsClient({ enabled: false })` gives the same effect explicitly for call sites that always invoke `.init()` unconditionally.
- All request/response text (URLs, headers, bodies, method/status/timing pills) is rendered with `selectable` so it can be copied on-device. Each request/response header row also has a one-tap copy icon (`CopyIconButton`, `expo-clipboard`) next to its value, for copying without a long-press text selection.
- Network capture from three independent sources, all feeding one shared store:
  - `patchFetch` — Expo's native `fetch` (not XHR-based, so needs its own patch).
  - `patchXHR` — catches most third-party HTTP client libraries (their RN adapter typically uses XHR) and raw `XMLHttpRequest`.
  - WebView logging — `getWebViewInjectedJavaScriptBeforeContentLoaded(name)` + `handleWebViewMessage`, patches fetch/XHR _inside_ a `<WebView>` page and relays back over `postMessage`, since a WebView is a separate JS engine invisible to the two patches above. Also posts a `navigation` event on every fresh page load (each navigation gets a new `window`, so the injected script re-running is itself the navigation signal) — used for Preserve Log.
- `webviewSources` as a typed, enforced allowlist (compile-time via a `const` type parameter, runtime via a filter in the message handler).
- Request/response headers, mimeType, and size are captured for all three sources (`patchFetch`, `patchXHR`, and the webview script) — headers via `init.headers`/`response.headers` for fetch, a `setRequestHeader` patch + `getAllResponseHeaders()` for XHR. `mimeType` is the content-type header with the charset stripped; `size` prefers `Content-Length`, falling back to the response body's length.
- `classifyResourceType` buckets a response into the same Network-tab type categories a browser's own devtools use, derived from its mimeType: Fetch/XHR, JS, Img, Media, Other.
- `NetworkView` — full toolbar UI reading the shared store via `useSyncExternalStore`. Styled with a fixed, hardcoded palette matching a browser's light-mode Network tab (no theme customization — deliberately out of scope; one good-looking default beats a configurable system nobody asked to maintain). Icons via `@expo/vector-icons/MaterialIcons` (imported by direct subpath, not the barrel export, to avoid bundling all 19 icon font families for one icon set).
  - Toolbar: Stop/Start (`fiber-manual-record` red / `radio-button-unchecked` gray — two distinct icons, not just a recolor, matching how browser devtools do it), Reverse sort, Clear, Preserve Log, Export, Settings, Filter.
  - **Preserve Log**: when off, a WebView navigation event clears the log automatically (`networkLogStore.notifyNavigation`). Defaults to **on** — deliberately different from most browsers' own default-off, since native fetch/XHR entries have no "page" concept to justify auto-clearing; a WebView user opts into that stricter behavior by turning it off.
  - **Export**: opens the share sheet with the currently-filtered entries as JSON via React Native's own `Share` — no filesystem module, so nothing is written to disk. iOS additionally gets a base64 `data:` URL so the sheet has a named attachment to hand to Files/Mail; Android's `Share` takes text only. Not a byte-accurate HAR file — HAR compliance would mean fabricating fields we can't actually measure (see hard limits below); a plain JSON dump is honest about what we actually captured. A real `.json` on disk would need `expo-file-system` + `expo-sharing`, which isn't worth two native modules for one button.
  - **Settings panel**: Big request rows (row density), Group by frame (groups rows by `source` via `SectionList` — our analog of a browser's iframe-based frames, since we don't have iframes but do have distinct transports/WebView names), Show overview (a simplified timeline strip, ticks positioned by relative `startedAt`, colored by status — no phase breakdown, see hard limits).
  - **Filter panel**: search + Invert, "More filters" (Hide data URLs, Hide failed requests — this is our analog of a browser's "blocked requests" checkbox; we don't have active request blocking, so it hides `status === 'error'` entries instead), Type chips (Fetch/XHR, JS, Img, Media, Other — matches a browser's exact set), Method chips (GET/POST/etc., derived from what's present — our own addition, browser devtools don't have this), Source chips (fetch/xhr/webview name — also our own addition).
  - Row view: zebra striping, Name/Status/Type/Size/Time columns (Name = last URL path segment, full method+URL shown as a secondary line).
  - Tap a row → a custom animated slide-up detail panel (`Animated.timing`, not a bottom-sheet library) with **Headers** (General + Request/Response headers), **Preview** (JSON pretty-printed when parseable), **Response** (raw body), **Timing** (Started At + Duration, with an explicit note that phase breakdown isn't available — see hard limits) tabs. A kebab menu next to the tab bar offers quick actions on the current entry: Copy URL, **Copy as cURL** (method + headers + body serialized into a copy-pasteable curl command), and Copy request payload/response when present.
- Full, untruncated request/response bodies — no size cap on what's stored per entry (only the ring buffer's 200-entry _count_ is capped).
- **Sandbox** — "Try in sandbox" (first in the kebab menu, with an animated `SparkleIcon`) opens a second sheet seeded from the current entry: editable method, URL, Query Parameters/Headers/Cookies tables (each row toggle-able, always one trailing blank row to type into), a raw request-body editor, a live-updating cURL snippet, and a Send button that fires a real `fetch()` and shows the response (status, headers, body — reusing the same JSON tree / syntax highlighter as Preview). Cookies are a user-editable convenience table serialized into a `Cookie` header at send time, not a real jar read (see hard limits above).

## Hard platform limits (not effort, not planned)

- **Timing waterfall for native fetch/XHR** — DNS/TCP/TLS/TTFB happen in the native networking stack below JS; a patch can only ever see start and end. The Timing tab says this explicitly rather than fabricating numbers.
- **Real response preview rendering** (image thumbnail, rendered HTML) — a browser's devtools can do this because it's a browser engine. A React Native list row isn't one; pretty-printed JSON/text is the realistic ceiling.
- **Cookie jar visibility for native fetch** — RN doesn't expose one the way a browser does, so there's nothing real to show for native calls (a WebView is different — real cookies exist there, not yet surfaced).
- **Active request blocking** — browser devtools let you configure URL patterns to actively block; we don't have this, so "Hide failed requests" (filtering already-failed entries) stands in for that "blocked requests" checkbox rather than a true blocking feature.
- **Byte-accurate HAR export** — our HAR-adjacent data lacks real wire timing/size, so Export produces a plain JSON dump instead of pretending to be a spec-compliant HAR file.

## Feasible, not yet built

1. **Initiator (call site)** — capture `new Error().stack` at request time in each patch to show what code triggered a request.
2. **Cookies tab** — for WebView-sourced requests specifically, since real cookies exist there (not for native fetch/XHR, per the hard limits above).
3. **WebView-only real timing breakdown** — a WebView page has the actual `PerformanceResourceTiming` API, so a DNS/connect/TTFB/download phase breakdown is genuinely possible there specifically, unlike native fetch/XHR.

## Beyond network: other tabs from the original plan

From `docs/plan.md`'s description of `@axonpack/expo-devtools` ("on-device, prod-safe debug tool... network / storage / database / console inspector tabs... console ring-buffer capture... logger... draggable DEV FAB"), the console tab and the FAB now exist; the storage/database tabs don't.

**Console tab — built.** `patchConsole` wraps `log`/`info`/`warn`/`error`/`debug` and forwards to whatever was already there, so React Native's own LogBox (which patches `console.error`/`warn` itself) keeps working. Entries land in `consoleLogStore`, the same disabled-until-`init()` ring buffer pattern as the network log, capped at 500 rather than 200 — console output arrives an order of magnitude faster than requests do. Consecutive identical messages collapse into one row with a count, the way a browser console does, so one log inside a render doesn't evict the buffer. Each argument of a call becomes its own cell rather than being flattened into one string, **one per line**. Chrome flows them inline instead, and this did too for a while — but a phone's width rarely holds a string and an object side by side, so the inline version spent most of its time wrapping anyway. Primitives render as tone-colored monospace text (a long one clamps to six lines behind a Show more toggle); an `Error` shows its message with the stack behind a disclosure; an object/array/`Map`/`Set`/class instance renders in the same inspectable, syntax-highlighted `JsonTree` the Network tab's Preview uses, but **collapsed to its one-line `{…}` preview** (`JsonTree` takes a `defaultExpanded` prop; Network still defaults to expanded). Tap a node to expand, long-press to copy. Every row carries a `CopyIconButton` that copies the whole flattened message, with the timestamp bottom-right.

**WebView console capture — built.** A page in a `<WebView>` runs in its own engine, invisible to `patchConsole` for exactly the reason `patchFetch`/`patchXHR` couldn't see its requests, so `webview-console-logger.service.ts` patches `console` inside the page and relays over `postMessage`. It reuses the existing `webviewSources` allowlist — a WebView already declared for network capture gets console capture with no extra config — and its script is concatenated onto the one `getWebViewInjectedJavaScriptBeforeContentLoaded` already returns, so a consumer still sets one prop and wires one `onMessage`. It carries its own message marker rather than a `type` on the network envelope: each handler recognizes only what it owns and reports whether it took the message, so neither service grew a branch belonging to the other. The patched methods call through to the page's own `console`, leaving a remote debugger attached to the WebView unaffected.

Arguments are serialized to `ConsoleArg` **inside the page**, because `postMessage` is JSON — a function, an `undefined` and an `Error` would all arrive as nothing useful. That means `format-console-args.util.ts` is deliberately duplicated as ES5 in the injected string; it runs in a foreign engine and can't import ours. Relayed payloads are shape-checked before reaching the store rather than trusted: any page can post a message wearing our marker, including one nobody in this repo wrote.

`ConsoleLogEntry.source` is `'native'` for the app's own context (including REPL rows) or the WebView's name. It's part of the repeat-collapse comparison, so a page and the app logging the same text stay separate rows; page rows carry a `WebView::[name]` label; and Source chips appear in the filter panel only once more than one source has actually logged, since a native-only app would otherwise get a chip row with one permanently-selected option.

Level glyphs follow Chrome's: a filled `cancel` for error, filled `warning` triangle, filled `info` circle, `bug-report` for debug, and **nothing at all for a plain log** — an empty 14px spacer keeps its text on the same left edge as every other row.

Object arguments are deep-copied into the tree's `JsonValue` shape at capture time (circular-safe, depth-capped at 6, a throwing getter becomes `[Threw]`) rather than held by reference. Holding references would pin 500 live app objects in the ring buffer and would make an expanded row show the object's state _now_ instead of when it was logged. The flattened `entry.text` is kept alongside for search and repeat-collapse.

The list reads **oldest at top**, like a terminal — the opposite of the Network tab, and the reason the Console toolbar has no sort toggle where Network has one: a prompt docked at the bottom only makes sense against one ordering, and offering both would leave the input detached from the newest output half the time. That ordering comes from `FlatList`'s `inverted` rather than reversing the array: the store's newest-first order is passed through untouched, the list anchors itself to the newest end, and following the tail needs no scroll effect at all — new rows land at offset 0, where you already are. Scroll up and nothing yanks you back, with `maintainVisibleContentPosition` absorbing the row-height jolt that prepending would otherwise cause; a floating jump-to-bottom button appears until you return. The one thing worth remembering: in an inverted list the newest end is offset **0**, so "am I at the bottom" is `contentOffset.y <= slack`, not a content-height subtraction. The rest of the toolbar (record/clear/filter, level chips with counts, warning/error counts) matches Network.

**Console REPL — built.** A `>` prompt is docked below the list, full-width with a single top separator rather than the bordered, rounded box `INPUT_STYLES.md` specifies for inline inputs. Submitting echoes the source as an `input` row and writes the answer back as a `result` row, rendered through the same argument cells — so an object result is an inspectable tree, and a thrown error shows its stack. A promise lands as `Promise {<pending>}` and fills in when it settles. REPL rows are exempt from repeat-collapse and from the pause gate: a command you just typed always appears.

Evaluation uses `new Function(...names, source)`, expression form first (`1 + 1` → 2) falling back to statement form (`const x = 1`). Not `eval` — Hermes deliberately excludes _local mode_ `eval()`, and there'd be nothing to gain from the indirect kind. Scope is globals plus injected names, because Metro compiles every module into a closure that no scope can reach into. Two names are always injected: `$modules(query?)` lists the source paths Metro has loaded and `$m(path)` returns a loaded module's exports, both read off `__r.getModules()`. Those are undocumented Metro internals and `__DEV__`-only, and `$m` deliberately skips modules that haven't initialized, since requiring one would execute it. `console: { context: { store, queryClient } }` adds your own names — optional, but the only thing that works in a release build.

`repl` defaults to `__DEV__`. It compiles and runs whatever is typed, so it stays out of release builds unless a consumer opts in explicitly.

Not built for console yet:

- **REPL history beyond tap-to-recall** — tapping an `input` row loads it back into the prompt (via `consolePromptStore`, which also holds the draft so typing doesn't re-render the list), but there's no up-arrow-style cycling and no eager-evaluation preview. Completion covers identifier paths only — it can't complete the string argument inside `$m('…')`.
- **`%s`/`%d`/`%o` format specifiers** — a `console.log('n: %d', 5)` renders as `n: %d 5` rather than substituting.
- **Call-site (which file logged this)** — same `new Error().stack` approach as the network initiator idea, and the same reason it's not on by default: capturing a stack on every log is expensive.
- **Console entries in Export** — Export is still network-only.
- **`undefined`, functions and symbols nested inside a logged object** — the tree's `JsonValue` shape has no slot for them, so they snapshot to the strings `'undefined'` / `'ƒ name()'` / `'Symbol(x)'` and render quoted. Only affects nested values; as a top-level argument each still renders in its own untyped cell.

**Storage tab — built.** Lists every key in every store you register, with its value, type and byte size; searches and filters over them; opens a value in the same inspectable `JsonTree` the Network tab's Preview and the Console tab's object cells use; and edits or deletes one key at a time.

The one structural difference from every other tab: **it cannot discover anything on its own.** Network patches globals it knows are there and Performance reads platform APIs, but a key-value store is a separate install with its own native code (`@react-native-async-storage/async-storage`, `react-native-mmkv`, `expo-secure-store`), and this package deliberately depends on none of them. So the stores come in through the client config, next to `webviewSources` and for the same reason — a declared list is both the allowlist and the type surface:

```ts
createDevtoolsClient({
  storage: {
    adapters: [
      asyncStorageAdapter({ driver: AsyncStorage }),
      mmkvAdapter({ driver: mmkv }),
      secureStoreAdapter({ driver: SecureStore, keys: ['session'] }),
      defineStorageAdapter({
        name: 'In-memory',
        kind: 'sync',
        getAllKeys,
        getItem,
        setItem,
        removeItem,
      }),
    ],
  },
});
```

Four factories, all written in terms of `defineStorageAdapter`, which duck-types nothing and takes exactly what it is handed. Reads always go through `await`, sync drivers included — awaiting a non-promise costs one microtask and removes a second code path, so `kind: 'sync'` is a badge in the UI and an honesty note, never a branch. Every call goes through the driver object rather than a destructured method reference, because a native instance's method loses `this` the moment you pull it off. Both async-storage batch APIs are accepted (3's `getMany`, 1/2's `multiGet`), as are both MMKV majors (4 renamed `delete` to `remove` and returns `ArrayBuffer` where 3 returned `Uint8Array` — the driver type asks only for a `byteLength`).

The store follows the same `EventEmitter` + `useSyncExternalStore` shape as the network log and the same disabled-until-`init()` gate, with **no `paused` flag** — that second gate exists for the three tabs recording a stream whose cost is continuous. Storage is a pull: its cost is per read, so the toolbar carries Refresh where the others carry a record button, and `DevtoolsToolbar` grew optional record/clear props to make that possible. It carries **no clear button at all** — that icon means "clear the log" in three tabs and must never come to mean "wipe your storage". Which store you're looking at is a dropdown in that same toolbar row (`adapter-selector.component.tsx`, built on `ContextMenu` like the header's theme picker) rather than a chip per store: chips took a row of their own and wrapped to two lines once an app registered four, and the toolbar already had the width for one control.

MMKV has no "what type is this key" call, so a value's type is discovered by probing `getString` → `getNumber` → `getBoolean` → `getBuffer`, each checked with `!== undefined` rather than truthiness: a stored `0` and a stored `false` are values, and reading them as misses would hide them from the tab. An edit writes back through the type it was read as, so a number edited in a text box is still a number to the store — and a non-numeric edit of a numeric key is refused rather than silently stringified.

The toolbar is the only pinned row: the summary and the filter panel are the list's `ListHeaderComponent`, so they scroll with the rows. Pinned they were taller than the list they filtered, and RN's `flexShrink` defaulting to 0 meant the unbounded list didn't shrink to fit — its tail simply ran off the bottom of the screen with nothing able to scroll it back. Hence `flex: 1` on both lists here and in the Network tab, which had the same latent shape. The header is passed as an element rather than a function, since a fresh function each render is a new component type to `VirtualizedList` and would remount the search box — dropping its focus on every keystroke.

Filters mirror the Network tab's, including regex/case/whole-word search modes, Invert and Clear: search scope (keys / values / both — a key and its value are different haystacks), type chips with counts, sort by key/size/type in either direction, Group by namespace (recovering the `auth:token` / `cache/user/1` prefix conventions no store knows about), Hide empty values and JSON only. A value's type is classified **once at read time** and stored on the entry, because classification parses JSON and re-running it for a thousand keys on every keystroke would be the slowest thing in the tab.

Storage-specific hard limits, stated in the UI rather than papered over:

- **SecureStore cannot enumerate.** The keychain/keystore is addressed by key, not listed, so `secureStoreAdapter` takes the keys worth watching and the summary says that's what it's showing — an unenumerable store would otherwise read as an empty one.
- **A read cap.** `maxKeys` (1,000 by default) bounds the read; past it the summary names the real total rather than quietly showing a short list.
- **Binary values are shown, never edited.** There's no text form of the bytes to round-trip, so only their length is reported.
- **No store-wide clear, and no add-key.** Deliberate: the tab edits and deletes one key at a time.
- **No mutation history.** Nothing patches the store instance you register, so the tab sees state, not the writes that produced it. A Changes feed (before → after, with revert) would mean wrapping `setItem`/`removeItem` the way `patchFetch` wraps `fetch`; the store and adapter shapes are ready for it.

**The launcher button is self-guarding.** `DevtoolsOverlay` subscribes to `devtoolsReadyStore`, which
`init()` flips at its very end — past the `enabled` gate and past every subsystem — and renders nothing
until then. An app that mounts the overlay without a `__DEV__` check therefore ships no button rather
than one opening empty lists, and `enabled: false` leaves it hidden too. It is a store rather than a
boolean because the order isn't guaranteed: `init()` normally runs at module scope, but an app calling
it from an effect mounts the overlay first and needs the button to appear when it lands.

The crash report sheet is deliberately outside that gate — it is the one subsystem meant to run in
production, so an unguarded overlay still delivers crash reports while showing no devtools UI.

**Crashes tab — built.** Captures the errors that end a session — or nearly do — and turns each into a
report you can read on the device: message, stack, component stack, breadcrumbs, device details, and
the whole record as JSON, with copy-as-Markdown / copy-as-JSON / share on every one. A newly captured
crash opens the report sheet on its own; the tab keeps the history with an unread marker, and the tab
bar carries the unread count.

**It is the one subsystem meant to survive into production**, so it has its own gate. The
package-wide `enabled` flag switches off every other tab, and `crash.enableWhileDevtoolsDisabled`
keeps crash capture running past it — which means `init()` can be called unconditionally:

`enableWhileDevtoolsDisabled` installs the handlers **when the client is constructed**, not at
`init()` — the one deliberate exception to "nothing in this package runs until `init()`". It has to
be: "the devtools are off" covers `if (__DEV__) devtools.init()` just as much as it covers
`enabled: false`, and waiting for a call that never comes would make the flag a promise the package
doesn't keep. Setting it is the consent `init()` would otherwise have given, and it buys earlier
coverage — handlers installed at import catch what is thrown before `init()` would have run.

Both shapes therefore work, and neither needs a guard around anything but the overlay:

```ts
const devtools = createDevtoolsClient({
  enabled: __DEV__,
  crash: {
    enableWhileDevtoolsDisabled: true,
    breadcrumbs: __DEV__, // request URLs and log lines — off in release by default
    redact: (record) => record, // runs before the store, the disk and onCrash
    onCrash: (record) => reportToBackend(record),
  },
});

devtools.init(); // no guard needed: everything but crash capture stops at `enabled`
```

…or, keeping the guard the app already had:

```ts
const devtools = createDevtoolsClient({
  crash: { enableWhileDevtoolsDisabled: true },
});

if (__DEV__) devtools.init(); // crash capture is already installed; this adds the panel
```

Turning it on brings **only** the crash handlers. The panel, the REPL, console capture and full-body
network logging stay off, which is the entire point — the last of those is a PII surface nobody wants
in a release build.

Four tiers, and which one caught a crash decides how much it can tell you:

- **JS errors** — the `ErrorUtils` global handler, _wrapped_ rather than replaced. React Native
  installs its own at startup (`setUpErrorHandling.js`); calling the previous one afterwards is what
  keeps LogBox, the red box and RN's native reporting alive.
- **Unhandled promise rejections** — `HermesInternal.enablePromiseRejectionTracker`. This is the tier
  that adds the most in a release build: RN registers its tracker **only under `__DEV__`**
  (`Libraries/Core/polyfillPromise.js`), so an unhandled rejection in production is currently silent.
  It is a single-slot API, so ours displaces RN's in dev — re-emitting through `console.error`
  restores LogBox, since `installConsoleErrorReporter` routes that into it. Done that way rather than
  importing `ExceptionsManager` to stay off a deep, version-specific path into RN's internals.
- **React render errors** — the exported `<DevtoolsErrorBoundary>`. The only tier that produces a
  **component stack**, which is usually the half worth reading, and it turns a white screen into a
  fallback with a Try again button.
- **Uncaught native exceptions** — `Thread.setDefaultUncaughtExceptionHandler` on Android,
  `NSSetUncaughtExceptionHandler` on iOS, both chained to whatever was installed before them.

**Which tiers capture depends on the gate.** With the devtools enabled, all four do. With them
disabled, only `native-exception` does — the JS tiers report errors the app survived, which is a
developer's concern, and the sheet there is in front of a user. A fatal JS error still arrives, since
React Native turns it into a native exception on its way to killing the process, so the native handler
picks it up. The JS handlers are not installed at all in that mode, and `captureCrash` filters by kind
as well, because `DevtoolsErrorBoundary` is a component the app mounts rather than a handler this
package installs.

There is no option for whether the sheet opens: a captured crash always opens one. The gate is capture
itself.

A crash that ends the process gives JavaScript no further turn, so the record is written **from
native, on the dying thread**, to a JSON Lines file in the app's own sandbox — Application Support on
iOS (not Caches, which the system may purge), `filesDir` on Android. It is drained at the next
launch, which is also what proves the process died: a record still in the file outlived the run that
wrote it. Persisting from native rather than JS is also what keeps the "this package depends on no
storage library" rule intact. JS fatals are persisted the same way, since RN may take the process
down right behind them; non-fatal records are not, because the app survived them and re-reporting one
at the next launch would be a bug.

**The sheet has two forms, and the wrong one in a release build is a real problem.** The full sheet is
a debugging tool: five tabs, a stack tree, a raw JSON dump, and this package's own logo on the header.
Putting that in front of somebody using the app is a category error. So `crash.popupDetail` defaults to
`'auto'` — the full sheet when the devtools are enabled, and a **compact** sheet when they are not:
what broke, when, the app version, and Share / Copy / Dismiss. Nothing on it names this package, and
the full record still travels with Share and Copy, which serialise everything the detailed sheet would
have shown. `'full'` and `'compact'` force it either way, for an internal build that ships the sheet
but not the panel.

The compact sheet carries **no close cross** — its two buttons are the way out, so dismissing is a
choice rather than something you swipe past. The second button is **Restart app** where that is
genuinely possible and **Close** where it is not: Android relaunches through the native module
(launcher intent on a fresh task, then `exit(0)`, because a soft JS reload would leave the native
state the crash happened in), while iOS has no supported way for an app to relaunch or terminate
itself — `exit(0)` is a documented App Store rejection. The backdrop and the Android back button still
dismiss it either way; a sheet with no exit at all is a trap.

The compact sheet is also why theme registration moved above the `enabled` gate: it is the one piece
of UI in this package that can render in a release build, and it reads the same palette as the panel.

`crash.disableDefaultLogBox` turns React Native's own error UI off, for an app that would rather read
a crash in the report sheet than in a red box. It calls `LogBox.uninstall()` rather than
`ignoreAllLogs()` — muting only hides the toasts, and RN's own comment on that method says "uncaught
errors will still open a full screen LogBox". Uninstalling clears the `isInstalled` flag gating
`addException`, which is what actually stops the red box. **The yellow warning toasts go with it**:
LogBox is one component and the two cannot be separated, so warnings are left to the Console tab.
Turning it on while `showPopup` is off means a JS error surfaces nowhere on screen, so that
combination warns once at `init()` rather than silently swallowing errors.

Breadcrumbs cost almost nothing: they are read from the console and network ring buffers that already
exist, so nothing is recorded _for_ crash reporting.

Hard limits, stated in the UI rather than papered over:

- **No symbolication.** A release bundle is minified and this package ships no source maps, so the
  frames point into the bundle. The Stack tab says so instead of implying otherwise.
- **No signal handlers.** `SIGSEGV`/`SIGABRT`/`SIGBUS`, Swift `fatalError` and NDK crashes are out of
  scope. Catching them needs an async-signal-safe handler that would fight Crashlytics, Sentry and
  Bugsnag over the same slot, and would yield unsymbolicated addresses anyway. Uncaught exception
  handlers cover essentially every real React Native crash and carry none of that risk.
- **No ANR or watchdog detection.** A hung main thread is a different mechanism from an exception.
- **Expo Go loses two tiers.** Native exception capture and the device block need the native module,
  so in Expo Go a record carries only what JavaScript itself knows.

Not built for crashes yet:

- **Sending reports anywhere.** `onCrash` hands you the record; there is no transport, no queue and no
  retry. Shipping one would mean opinions about endpoints and offline batching that belong in the
  app.
- **Grouping and fingerprinting.** Every capture is its own row; two hundred instances of one bug fill
  the buffer instead of collapsing the way the console's repeat-collapse does.
- **Session and route context automatically.** `setCrashContext` takes whatever you give it, but
  nothing hooks a navigation library to fill in the current route on its own.

Still missing entirely:

- **Database tab** — SQLite and friends. Genuinely different from the storage tab: a table needs schema, queries and paging rather than a key list, so `expo-sqlite` is deliberately not squeezed into a key-value adapter.
