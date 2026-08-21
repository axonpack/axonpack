# Network

Every HTTP request the app makes, captured on the device. Three interception paths feed one store,
and the tab is modelled on a browser's own Network panel closely enough that the vocabulary
transfers.

## Features

- [x] Captures `fetch`
- [x] Captures Expo's own fetch when it is imported directly, not only through the global
- [x] Captures `XMLHttpRequest`, so third-party HTTP clients show up
- [x] Captures requests made inside a WebView
- [x] Turn plain requests and sockets off independently
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
- [x] Override a response with a chosen status and body, or block a request outright
- [x] Server-sent event streams, with every event, whichever client opened them
- [x] Queued, DNS, TCP and TLS time, measured by the platform's own HTTP stack
- [x] What a compressed response cost on the wire, beside what the app was handed
- [ ] WebSocket connections opened inside a WebView
- [ ] Event streams opened inside a WebView
- [ ] Cookies for WebView requests
- [ ] Real timing breakdown for WebView requests
- [ ] An XML response as a tree
- [ ] Turn stream capture off independently, the way requests and sockets already can be
- [ ] Capture requests made before the panel is set up
- [ ] Export a socket or stream entry too, and version the file
- [ ] Requests from a native HTTP client that never touches JavaScript
- [ ] Throttle upload speed, not only download

## Next

The open list above is a menu, not an order. What is worth doing next, and why, roughly in that order:

1. **Verify the phase timing on Android.** iOS is done — built and run on a simulator, with real
   phases and byte counts arriving for both Expo's fetch and `XMLHttpRequest`. The Kotlin has still
   never met a compiler, and three of the four bugs iOS turned up were the kind only a device finds,
   so assume Android has its own.
2. **Reach Expo's fetch on Android.** iOS now covers it; Android does not, because Expo's fetch there
   has its own OkHttp client rather than React Native's.
3. **Send the timeline, not the durations.** The waterfall places each phase where the ones before it
   ended, and now prints that start as a number — but the platform reports durations, and butting them
   together assumes the phases are contiguous. They are not: on a real request the phases sum to
   1003 ms against a duration of 1114 ms and a JS-measured wait-to-first-byte of 889 ms, so roughly
   97 ms sits in gaps the stack does not attribute to any phase. iOS has every boundary as a date on
   the same transaction metrics, and OkHttp has a callback for each, so sending offsets instead of
   lengths would place every bar truthfully and let a gap read as a gap.
4. **Requests from a native HTTP client that never touches JavaScript.** Now the largest hole in
   capture rather than in display: a JSI client answers no patch, and the only way in is whatever
   observer API it publishes for itself.
5. **Capture requests made before the panel is set up.** Everything before `init()` is invisible,
   which is most of a cold start.
6. **The smaller display gaps** — an XML response as a tree, a version and a socket-shaped entry in
   the export, and a switch for stream capture beside the ones requests and sockets already have.
7. **The row's own size figure.** The two sizes are separated in the detail panel, but the size on the
   row is still the single `size` field, which is the declared length when there is one and the body's
   length otherwise. Deciding what one column should say — and it should probably say what crossed the
   wire, the way a browser's does — is the rest of this job.

Two things on the open list are known to be blocked rather than merely undone, and the reasons are
in Won't do: cookies and real phase timing for WebView traffic both need what a page's own engine
does not hand out.

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
- **A blocked request is never sent. An overridden one depends on how it was made.** Blocking stops
  the call either way. Overriding a `fetch` answers it before anything leaves the device, so an
  endpoint that does not exist yet can be developed against and a failure reproduced without a server
  willing to produce one. Overriding an `XMLHttpRequest` cannot do that: nothing there can stand in
  front of the native send and return a response, so the request goes out and what the app _reads
  back_ is replaced instead. The rule still decides what the app sees, but the round trip is still
  paid and the endpoint still has to exist. That difference is real and worth knowing before leaning
  on it — a request that must not happen at all should be blocked, not overridden.
- **The row says when a rule answered.** A made-up answer that reads like the server's own is worse
  than no answer at all, so an intercepted row carries a badge. On the `XMLHttpRequest` path the log
  records what the app was handed rather than what the server said, because by then the two are the
  same values.
- **Rules match the whole URL and nothing near it.** One that catches more than you meant is a
  request you cannot explain, and the row a rule is made from always knows its exact URL.
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
- **A stream is the request it arrived on, and its events are its body.** `text/event-stream` is
  recognised on the response rather than on any one client library, so a stream is captured whichever
  of the two transports every SSE client is built on it used — `react-native-sse` and anything else
  built on `XMLHttpRequest`, or a streaming `fetch`. It is one row rather than a second entry kind
  beside sockets because on the wire it is one HTTP request, whose status code, headers and cookies
  all still mean what they say. Nothing about it is awaited: reading a body with no end as text would
  hold the app's own `await fetch(...)` open for as long as the stream lived. The raw stream is not
  kept as a body either, since it has no size — the events are, up to 1,000 of them, the way a
  socket's messages are. And closing a stream is how a stream ends, so the abort underneath it is
  reported as an end rather than as a cancelled request.
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
- **Phases come from the platform's HTTP stack, and from nowhere above it.** React Native's own
  performance timeline was the obvious source and turned out to be empty: it reports a resource entry
  whose phase fields are all stamped from three instants a patch already sees. The real measurements
  are one layer lower — `URLSessionTaskMetrics` on iOS, an OkHttp `EventListener` on Android — so the
  native module collects them there and JavaScript only attaches them to a row.
- **The metrics go to the _session_ delegate, not the task delegate.** This is the distinction that
  cost the most: Expo's fetch was hooked at `ExpoURLSessionTask` first, which resolved, accepted the
  added method, and was never called — because that object is only the per-task delegate a proxy in
  `ExpoModulesCore` forwards to, and URLSession reports metrics to the session's own delegate. A hook
  that reports success and never fires is worse than one that fails loudly, which is why the install
  now names the classes it actually reached.
- **A byte count of zero is a claim, so it is never sent.** A response served from the URL cache
  crossed no wire, and a 304 revalidation carries a couple of header bytes and no body at all — the
  first readings off a device were exactly that, `2` and `0`, for a 24 kB body. Both counts are summed
  across a redirect chain and dropped entirely when nothing was counted, so the tab says nothing rather
  than reporting an empty body.
- **A boolean from native arrives as a number.** `isReusedConnection` crosses the bridge as `0` or
  `1`, so the `=== true` the UI checks was false for every reused connection until it was coerced.
  Worth remembering for anything else this module ever sends.
- **The metrics delegate method is added, never swizzled.** On iOS the phases arrive through an
  optional `URLSession` delegate method that neither React Native's request handler nor Expo's fetch
  implements, so it is added to those classes at runtime. Adding cannot alter or delay a request the
  way standing in front of an existing method could, and a class that already implements it is left
  alone — another tool collecting the same metrics keeps working, and this package reports nothing for
  that stack rather than fighting for it.
- **A reading is matched to a row by URL and time, because nothing shares an id.** The native stack
  knows a task and the patches know a call, and no identifier crosses between them. So the same URL
  requested twice at once is genuinely ambiguous, and the closest start wins; a row that already has
  phases is never overwritten, and a reading that matches nothing is dropped rather than kept for
  later. Every request the process makes is reported, including ones from before recording started.
- **A compressed response has two sizes, and one number could only ever be one of them.** The tab
  showed whichever happened to be available — `content-length` when the server sent one, the body's
  own length when it did not — which for a gzipped response are wildly different figures under one
  label. They are separated now: what crossed the connection, what the app was handed, and the saving
  between them. The platform's byte counts are the only source that knows both for certain, so they
  win; a declared length on an _encoded_ response is the wire size, since a header describes what was
  sent rather than what arrived. Where only one number can be had, the line says which one it is.
- **Bytes are counted as bytes, never as characters.** `String.length` counts UTF-16 units, so it
  reads a two-byte `é` as one and a four-byte emoji as two. Measuring a decoded body that way and
  comparing it against a count off the wire would invent a saving for any body not written in ASCII.
- **The wire count comes from below the decoder, on both platforms.** iOS reports both counts on the
  same transaction metrics the phases come from. Android needs two vantage points, because OkHttp
  gunzips transparently: a _network_ interceptor sits below that and sees the encoded body, while the
  event listener sees what the caller reads. So the interceptor leaves its reading for the listener to
  collect, keyed by URL, which is all the two sides share.
- **A phase that was not measured is absent, not zero.** A reused connection has no DNS, TCP or TLS
  phase at all, and three zeroes would read as a handshake that took no time — so the row says the
  connection was reused and shows only what happened.
- **Throttling is simulated in JS**, by delaying the response and the body. It models download speed
  and latency because those are the two numbers a patch can honestly impose; nothing about it slows
  the native socket down.

## Won't do

- **Telling apart headers that arrived more than once under the same name.** React Native hands
  JavaScript one value per header, joining repeats with a comma before they get here, so the split is
  gone before anything in this package can see it. `Set-Cookie` is the exception and the Cookies tab
  undoes it there — a cookie always starts with `name=`, which is enough to tell a separator comma
  from one inside an `Expires` date. No other header carries a marker that reliable.
- ~~**Queueing and connection setup, as phases before the wait.**~~ Being built, from native — see
  the feature list above and the decision below. The finding that sent it there is kept because it is
  the reason the implementation looks the way it does: not for want of an API. React
  Native has `PerformanceResourceTiming` with `fetchStart`, `connectStart`, `connectEnd` and
  `responseStart` on it, and a `'resource'` entry type this package already knows how to observe. The
  fields are filled from three instants rather than measured. `reportRequestStart` stamps `fetchStart`
  and `requestStart` from one `now`; both platforms then call `reportConnectionTiming` in the same
  breath as `reportRequestStart`, so `connectStart` lands in the same tick; and `reportResponseStart`
  stamps `connectEnd` and `responseStart` from one `now` again. Queueing therefore computes to zero
  and connection setup to the entire wait, which the tab already shows under its own name. On top of
  that, both `enableNetworkEventReporting` and `enableResourceTimingAPI` are native feature flags
  that default to off — Expo does not turn them on — so a default app emits no resource entries at
  all, and Expo's own fetch never enters React Native's networking stack to be reported on anyway.
  Real phases exist one layer further down, in `URLSessionTaskTransactionMetrics` on iOS and an
  OkHttp `EventListener` on Android, and reaching them means intercepting the platform's HTTP stack
  from native code rather than reading a JS API. That is where the phases now come from.
- **Separating DNS, TCP and TLS from one another.** A stronger version of the line above, and true
  whichever way the one above is settled: the JS class has no `domainLookupStart` and no
  `secureConnectionStart` at all, so even a connection phase that was measured would arrive as one
  number for the whole handshake.
- **The cookie jar itself.** React Native exposes none. Cookies are only ever what a captured
  request's own headers carried, so one the platform attached on its own from an earlier response is
  invisible.
- **A HAR file.** The format permits a `-1` for anything a tool could not measure, so a valid one is
  producible — but the timings that make a HAR worth opening somewhere else are the ones that would be
  `-1`, so Export stays a plain JSON dump.
