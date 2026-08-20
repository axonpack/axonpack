# @axonpack/expo-devtools — features

Scope: this package only.

**This is the only file that tracks feature status.** A plan doc beside it describes work not yet
built and moves to `logs/` once it ships; the notes under `research/` never complete. Neither carries
a checkbox.

## How to edit this file

- One top-level item per area (Core, Network, Console…), its features as a sublist underneath.
- Every line starts with `- [ ]` for not built or `- [x]` for shipped. Tick an area only once every
  feature under it is ticked.
- Describe a feature from the outside — what someone using the package gets. No file names, no
  function or option names, no explanation of how it works: that belongs in the code comments,
  `CLAUDE.md` and `logs/`.
- One plain-English line per feature. No sub-sublists, no paragraphs.
- New work goes under the area it belongs to; only a genuinely new surface earns a new area.
- **Won't do** at the bottom is for what the platform makes impossible. No checkboxes there — nothing
  in it is waiting to be built. Move a line there instead of deleting it, so the reason survives.

## Areas

- [ ] **Core**
  - [x] One factory call to set up, one call to start
  - [x] Nothing is captured or patched until the devtools are started, so it is safe to ship
  - [x] Draggable floating button that opens the panel
  - [x] The button hides itself when the devtools were never started
  - [x] Tabs keep their filters and scroll position while the panel is open
  - [x] Error and unread counts on the tab bar
  - [x] Seven built-in themes, plus your own palette on top of one
  - [x] Selectable text and one-tap copy throughout
  - [ ] Remember the chosen theme between launches

- [ ] **Network**
  - [x] Captures `fetch`
  - [x] Captures `XMLHttpRequest`, so third-party HTTP clients show up
  - [x] Captures requests made inside a WebView
  - [x] Declared WebView names act as a typed allowlist
  - [x] Full request and response bodies, headers, size and content type
  - [x] Requests bucketed by resource type, the way a browser does
  - [x] Pause and resume recording, clear the log, reverse the order
  - [x] Keep or auto-clear the log when a WebView navigates
  - [x] Search with regex, case and whole-word modes, invert it, and highlight the matches
  - [x] Filter by type, method, status and source; hide data URLs; hide failed requests
  - [x] Throttle the connection — 3G/4G presets, a custom speed, or offline
  - [x] Override the user agent, for native requests and inside a WebView
  - [x] Group rows by source, denser or roomier rows, timeline overview strip
  - [x] Request detail: headers, pretty-printed JSON preview, raw body, timing
  - [x] Copy the URL, copy as cURL, copy the payload or the response
  - [x] Export the filtered log as JSON to the share sheet
  - [x] Sandbox: edit any captured request and send it for real
  - [ ] Initiator — which code made the request
  - [ ] Cookies for WebView requests
  - [ ] Real timing breakdown for WebView requests

- [ ] **Console**
  - [x] Captures log, info, warn, error and debug
  - [x] Captures the console inside a WebView
  - [x] Each argument gets its own cell; objects render as an inspectable tree
  - [x] Errors show the message with the stack behind a disclosure
  - [x] Repeated messages collapse into one row with a count
  - [x] Reads oldest-first like a terminal, with a jump-to-bottom button
  - [x] Filter by level with counts, search, and filter by source
  - [x] A prompt for running expressions and statements on the device
  - [x] Inject your own values into the prompt's scope
  - [x] Browse and pull exports out of loaded modules from the prompt
  - [x] Tap a past command to load it back into the prompt
  - [ ] Command history cycling and a live result preview while typing
  - [ ] `%s` / `%d` / `%o` format specifiers
  - [ ] Call site — which file logged this
  - [ ] Console entries included in Export

- [ ] **Storage**
  - [x] Register the stores you use — AsyncStorage, MMKV, SecureStore, or your own
  - [x] Lists every key with its value, type and byte size
  - [x] Inspect a value as a tree
  - [x] Edit or delete a key
  - [x] Search keys and values, filter by type, sort, group by namespace
  - [x] Switch between registered stores
  - [x] Refresh on demand, since nothing is recorded continuously
  - [x] Says when a store cannot list its own keys, or when the read cap was hit
  - [ ] Add a new key
  - [ ] History of writes, with revert

- [ ] **Performance**
  - [x] Startup timing, including where the platform reports nothing
  - [x] JS frame rate, and the main thread's frame rate on a dev build
  - [x] JS heap over time
  - [x] App and device memory
  - [x] Disk space used and free
  - [x] Long tasks
  - [x] Slow interactions
  - [x] Your own marks and measures
  - [x] Pause and resume recording
  - [ ] Re-render and component timing

- [ ] **Crash reporting**
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
  - [ ] Send reports to a backend, with queueing and retry
  - [ ] Group duplicate crashes instead of one row each
  - [ ] Capture the current route automatically

- [x] **Debug**
  - [x] Block the JS thread for a chosen duration
  - [x] Block the main thread for a chosen duration
  - [x] Crash the JS thread on purpose
  - [x] Crash the main thread on purpose

- [ ] **Database**
  - [ ] SQLite tab — tables, schema, queries and paging

## Won't do — platform limits

- **Connection timing for native requests.** DNS, TCP, TLS and TTFB happen below JavaScript; only
  start and end are visible. The Timing tab says so rather than inventing numbers.
- **Rendered response previews.** No image thumbnails or rendered HTML — pretty-printed text is the
  ceiling outside a browser engine.
- **Cookies for native requests.** React Native exposes no jar to read.
- **Blocking requests.** Filtering already-failed entries stands in for it.
- **Spec-compliant HAR export.** The wire timing and sizes a HAR needs were never measurable, so
  Export stays a plain JSON dump.
- **Wiping a whole store from the Storage tab.** Editing and deleting one key at a time is
  deliberate.
- **Editing binary values.** There is no text form to round-trip, so only the length is shown.
- **Heap snapshots and flame charts.** Both come from the debugger protocol, not from anything
  reachable in the app.
- **Symbolicated crash stacks.** A release bundle is minified and this package ships no source maps.
- **Signal-level crashes.** Segfaults, `fatalError` and NDK crashes need a handler that would fight
  Crashlytics and Sentry for the same slot, and would report raw addresses anyway.
- **Hang and ANR detection.** A frozen main thread is a different mechanism from an exception.
- **Restarting the app from the crash notice.** iOS has no supported way for an app to relaunch or
  terminate itself.
- **Disk space on iOS.** Reading it obliges every app embedding this package to file a privacy
  declaration, for a number that is not about performance.
- **Full coverage in Expo Go.** Native exception capture, device details and the main-thread controls
  need a dev build.
