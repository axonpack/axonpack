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
  - **Export**: shares the currently-filtered entries as JSON via `Share.share` — not a byte-accurate HAR file. HAR compliance would mean fabricating fields we can't actually measure (see hard limits below); a plain JSON dump is honest about what we actually captured.
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
4. **Console REPL (run an expression on-device)** — possible, and in a dev build it needs no wiring from the consumer at all. Hermes deliberately excludes _local mode_ `eval()`, but global `eval` and `new Function(...)` work, so a typed expression runs against globals. Reaching the app's own modules is separately solvable: Metro's runtime sets `global.__r` unconditionally, and under `__DEV__` it also exposes `__r.getModules()` — a `Map` of module id → `{ verboseName, isInitialized, publicModule.exports }` — plus lookup by source path, `__r('src/stores/auth')`. That's enough to browse and grab any loaded module's exports from the REPL.

   What that registry can't do: it's gone in a release build (opaque numeric ids, no `verboseName`, no `getModules`), it's undocumented Metro internals that can change between versions, `__r`-ing an _uninitialized_ module executes it (side effects), and it surfaces every node_modules internal alongside app code. So an optional `console: { context: { store, queryClient } }` compiled as `new Function(...Object.keys(context), 'return (' + source + ')')` is sugar — short stable names that also survive a release build — not a prerequisite. Either way it's arbitrary code execution shipped inside the app binary, so it stays opt-in.

## Beyond network: other tabs from the original plan

From `docs/plan.md`'s description of `@axonpack/expo-devtools` ("on-device, prod-safe debug tool... network / storage / database / console inspector tabs... console ring-buffer capture... logger... draggable DEV FAB"), the console tab and the FAB now exist; the storage/database tabs don't.

**Console tab — built.** `patchConsole` wraps `log`/`info`/`warn`/`error`/`debug` and forwards to whatever was already there, so React Native's own LogBox (which patches `console.error`/`warn` itself) keeps working. Entries land in `consoleLogStore`, the same disabled-until-`init()` ring buffer pattern as the network log, capped at 500 rather than 200 — console output arrives an order of magnitude faster than requests do. Consecutive identical messages collapse into one row with a count, the way a browser console does, so one log inside a render doesn't evict the buffer. Arguments are serialized by `formatConsoleArgs` (circular-safe, depth-capped at 4); an `Error` argument's stack is kept and shown when the row is expanded. The view has record/clear/sort/filter matching the Network toolbar, level chips with counts, and warning/error counts in the toolbar.

Not built for console yet:

- **REPL / expression evaluation** — see "Feasible, not yet built" above.
- **`%s`/`%d`/`%o` format specifiers** — a `console.log('n: %d', 5)` renders as `n: %d 5` rather than substituting.
- **Call-site (which file logged this)** — same `new Error().stack` approach as the network initiator idea, and the same reason it's not on by default: capturing a stack on every log is expensive.
- **Console entries in Export** — Export is still network-only.

Still missing entirely:

- **Storage tab** — inspect AsyncStorage / SQLite / MMKV, whichever backend `@axonpack/lite-storage` ends up using.
- **Database tab** — likely overlaps heavily with the storage tab depending on what "database" ends up meaning once `@axonpack/lite-storage` exists.
