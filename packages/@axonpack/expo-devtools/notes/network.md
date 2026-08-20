# Network

Every HTTP request the app makes, captured on the device. Three interception paths feed one store,
and the tab is modelled on a browser's own Network panel closely enough that the vocabulary
transfers.

## Features

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
- [ ] Remember the throttling and user-agent choice between launches
- [ ] Throttle upload speed, not only download

## Where requests come from

Three paths, because no one of them can see the others' traffic:

- **`fetch`** — Expo installs its own native fetch, which does not route through `XMLHttpRequest`
  the way the old polyfill did. Patching XHR alone cannot see a single Expo fetch call.
- **`XMLHttpRequest`** — what actually catches third-party HTTP client libraries, whose React Native
  adapters are usually built on XHR, plus any raw XHR in app code.
- **Inside a WebView** — a page runs in a separate JS engine (WKWebView, Android WebView) that is
  invisible to both patches above. An injected script patches fetch and XHR _in the page_ and relays
  each request back over `postMessage`.

## Decisions worth knowing

- **Declared WebView names are the allowlist.** They are a `const` type parameter, so passing an
  undeclared name is a compile error, and the same list is checked at runtime — any page can post a
  message wearing our marker, including one nobody here wrote. It sits at the top level of the
  config rather than under `network` because the Console tab captures from a declared WebView too,
  and the list has to be one list.
- **Bodies are stored whole.** No truncation, by design: a request you can't read the body of is a
  request you can't debug. Only the entry _count_ is capped, at 200.
- **Relative URLs are resolved against the page's own location** for WebView traffic, since real
  pages request plenty of relative paths.
- **Preserve Log defaults to on**, unlike a browser. A WebView navigation is the only "page load" we
  can see, and native fetch entries have no page to belong to — clearing them on someone else's
  navigation would throw away the log for no reason the user asked for.
- **Throttling is simulated in JS**, by delaying the response and the body. It models download speed
  and latency because those are the two numbers a patch can honestly impose; nothing about it slows
  the native socket down.

## Won't do

- **Connection timing for native requests.** DNS, TCP, TLS and TTFB happen in the native stack below
  JavaScript; a patch sees start and end. The Timing tab says so rather than inventing a waterfall.
- **Rendered response previews.** No image thumbnails and no rendered HTML — pretty-printed text is
  the ceiling outside a browser engine.
- **Cookies for native requests.** React Native exposes no jar to read. A WebView has real ones,
  which is why that is open work above rather than impossible.
- **Blocking requests.** Filtering already-failed entries stands in for a browser's blocked-requests
  checkbox.
- **Spec-compliant HAR export.** The wire timing and sizes a HAR needs were never measurable, so
  Export stays a plain JSON dump.
