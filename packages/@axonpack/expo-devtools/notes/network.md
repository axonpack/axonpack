# Network

Every HTTP request the app makes, captured on the device. Three interception paths feed one store,
and the tab is modelled on a browser's own Network panel closely enough that the vocabulary
transfers.

## Features

- [x] Captures `fetch`
- [x] Captures Expo's own fetch when it is imported directly, not only through the global
- [x] Captures `XMLHttpRequest`, so third-party HTTP clients show up
- [x] Captures requests made inside a WebView
- [x] WebSocket connections, with every message sent and received
- [x] Declared WebView names act as a typed allowlist
- [x] Full request and response bodies, headers, size and content type
- [x] Binary response bodies, as bytes and as hex
- [x] Say when a body was too large to keep, or could not be read at all
- [x] Content type worked out from the body when nothing declares it
- [x] Response size worked out from the payload when nothing declares it
- [x] Requests bucketed by resource type, the way a browser does
- [x] Pause and resume recording, clear the log, reverse the order
- [x] Keep or auto-clear the log when a WebView navigates
- [x] Search with regex, case and whole-word modes, invert it, and highlight the matches
- [x] Filter by type, method, status and source; hide data URLs; hide failed requests
- [x] Throttle the connection — 3G/4G presets, a custom speed, or offline
- [x] Override the user agent, for native requests and inside a WebView
- [x] Group rows by source, denser or roomier rows, timeline overview strip
- [x] Request detail: headers, pretty-printed JSON preview, raw body, timing
- [x] Waiting and downloading, split out from the total
- [x] Upload and download progress while a request is still in flight
- [x] Tell a cancelled request apart from a failed one
- [x] Cookies a request sent, and the ones a response set
- [x] Initiator — which code made the request, with the source line around it
- [x] Preview an image, an HTML page or an SVG as it renders, from the bytes that came back
- [x] Copy the URL, copy as cURL, copy the payload or the response
- [x] Request bodies as fields, with each uploaded file's name and size
- [x] A form-data request copied as a cURL command that runs
- [x] Save one response body to a file
- [x] Export the filtered log as JSON to the share sheet
- [x] Sandbox: edit any captured request and send it for real
- [ ] Server-sent event streams, with every event
- [ ] A connection waterfall — queued, connecting, waiting, downloading
- [ ] Compressed and uncompressed response size
- [ ] Keep headers apart that were sent more than once under the same name
- [ ] WebSocket connections opened inside a WebView
- [ ] Cookies for WebView requests
- [ ] Real timing breakdown for WebView requests
- [ ] Override a response — a chosen status and body instead of the real one
- [ ] Block a request outright
- [ ] An XML response as a tree
- [ ] Name a row by its whole relative URL, not only the last segment
- [ ] Turn plain requests, sockets and streams off independently
- [ ] Capture requests made before the panel is set up
- [ ] Export a socket or stream entry too, and version the file
- [ ] Requests from a native HTTP client that never touches JavaScript
- [ ] Remember the throttling and user-agent choice between launches
- [ ] Throttle upload speed, not only download

## Where requests come from

Three paths, because no one of them can see the others' traffic:

- **`fetch`** — Expo installs its own native fetch, which does not route through `XMLHttpRequest`
  the way the old polyfill did. Patching XHR alone cannot see a single Expo fetch call. It is caught
  in two places rather than one: the global, and the module Expo exports it from, because importing
  that fetch directly never reads the global. Both stand in front of the same untouched function, so
  a request still appears once, labelled by the way it was called.
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
- **Text bodies are stored whole; bytes are not.** No truncation for text, by design: a request you
  can't read the body of is a request you can't debug. A body that isn't text is kept as bytes up to a
  ceiling, because holding an encoded copy of a video costs several times its own size and no panel
  is going to show it — past that the tab says the body was too big rather than showing an empty
  pane. Only the entry _count_ is capped otherwise, at 200.
- **An upload is replayed with `-F`, never as a raw body.** The boundary the platform generated is
  not in the headers a patch captured, so pasting the flattened parts back would send a body that
  contradicts its own `Content-Type`. Handing curl the parts and letting it write its own boundary is
  the only version of that command that runs — and the file parts name a path on whoever runs it,
  because a name is all the request itself carried.
- **What the server said about a body always wins.** The bytes are asked what they are only when
  nothing declared a type, which is common enough from a hand-rolled server; guessing over a
  declared type would make the tab lie about what arrived. The same goes for length: the payload is
  measured only when no header gave one.
- **A rendered preview is an opaque surface.** A bitmap goes to the platform's image view; HTML and
  SVG go to a WebView — SVG included, because the image view cannot draw one. Neither surface can be
  searched or highlighted the way text can, which is why the raw body stays a tab of its own.
- **The rendered surface is locked down, and the image one asks twice.** A response body is
  untrusted markup, so scripts are off inside the preview and a link in it cannot navigate — left at
  their defaults, a script in the body would run and a tapped link would open in the system browser
  rather than be refused. An HTML page that assembles itself with script therefore shows only its
  static markup. The image preview requests the URL a second time instead of drawing the bytes
  already captured, because a body is kept as text and an image does not survive that; the second
  request is logged like any other, and drawing the captured bytes is open work above that waits on
  bodies being able to hold binary at all.
- **Relative URLs are resolved against the page's own location** for WebView traffic, since real
  pages request plenty of relative paths.
- **Preserve Log defaults to on**, unlike a browser. A WebView navigation is the only "page load" we
  can see, and native fetch entries have no page to belong to — clearing them on someone else's
  navigation would throw away the log for no reason the user asked for.
- **Progress readings are throttled, and the last one always lands.** A body of any size fires
  progress per chunk, and each reading is a write to the log and a re-render of the row it is on, so
  they are dropped to one per interval. The final reading is never dropped, so the figure a finished
  request settles on is exact rather than merely recent. Only the latest is kept — a progress bar has
  no use for the history, and keeping it would make each row grow for as long as it downloads.
- **The initiator stack is captured cheaply and read expensively.** Every request keeps the call
  stack as the engine wrote it, which costs one thrown error. Turning that into file names and a
  source excerpt needs the development server, so it happens when the Initiator tab is opened and not
  before — and a release build, where nothing answers, says so rather than showing bundle offsets as
  if they were source.
- **Phase timing will come from the platform, not from the patches.** A patch can only see when a
  call left and when it came back. The phases in between are reported by React Native's own
  performance timeline, which covers what goes through its networking stack — so a request made by
  Expo's own fetch has a duration but no phases, and the tab has to say which it is showing.
- **Throttling is simulated in JS**, by delaying the response and the body. It models download speed
  and latency because those are the two numbers a patch can honestly impose; nothing about it slows
  the native socket down.

## Won't do

- **Separating DNS, TCP and TLS from one another.** The platform reports when a connection began and
  when it was ready, not the three phases inside that, so the waterfall above stops at one number for
  the whole handshake.
- **The cookie jar itself.** React Native exposes none. Cookies are only ever what a captured
  request's own headers carried, so one the platform attached on its own from an earlier response is
  invisible.
- **A HAR file.** The format permits a `-1` for anything a tool could not measure, so a valid one is
  producible — but the timings that make a HAR worth opening somewhere else are the ones that would be
  `-1`, so Export stays a plain JSON dump.
