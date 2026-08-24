# Network

Every HTTP request the app makes, captured on the device. Three interception paths feed one store,
and the tab is modelled on a browser's own Network panel closely enough that the vocabulary
transfers.

## Features

- [x] Captures `fetch`
- [x] Captures Expo's own fetch when it is imported directly, not only through the global
- [x] Captures `XMLHttpRequest`, so third-party HTTP clients show up
- [x] Captures requests made inside a WebView
- [x] Turn requests, sockets and streams off independently, by kind rather than by transport
- [x] WebSocket connections, with every message sent and received
- [x] Sockets a WebView page opens, with every frame in both directions
- [x] Streams a WebView page opens, with every event the engine dispatched
- [x] Real phases for a WebView request, measured by the page's own engine
- [x] The cookies a WebView page could see when it made a request
- [x] An XML response as a tree
- [x] Declared WebView names act as a typed allowlist
- [x] Full request and response bodies, headers, size and content type
- [x] Binary response bodies, as bytes and as hex
- [x] Say when a body was too large to keep, or could not be read at all
- [x] Content type worked out from the body when nothing declares it
- [x] Response size worked out from the payload when nothing declares it
- [x] Requests bucketed by resource type, the way a browser does
- [x] Pause and resume recording, clear the log, reverse the order
- [x] Sort by size, by duration or by status, in either direction
- [x] Keep or auto-clear the log when a WebView navigates
- [x] Search with regex, case and whole-word modes, invert it, and highlight the matches
- [x] Filter by type and status; hide data URLs; hide failed requests
- [x] Pick more than one method or source at once
- [x] A status expression rather than one band — an exact code, a range, a comparison
- [x] Filter by how large or how slow a request was, in the units you would say out loud
- [x] Show only what is still in flight, or only what a rule of yours answered
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
- [x] Export every kind of entry, with its messages or events, under a schema version
- [x] Throttle upload speed as well as download
- [x] Requests from a JSI HTTP client, read from the observer it publishes
- [x] Sandbox: edit any captured request and send it for real
- [x] Override a response with a chosen status and body, or block a request outright
- [x] Server-sent event streams, with every event, whichever client opened them
- [x] Queued, DNS, TCP and TLS time, measured by the platform's own HTTP stack
- [x] What a compressed response cost on the wire, beside what the app was handed

## Next

The open list above is a menu, not an order. What is worth doing next, and why, roughly in that order:

1. **Socket phases on Android.** `WebSocketModule` builds its own `OkHttpClient.Builder()` and never
   asks the provider, so the listener that covers requests cannot see a socket's connection. Requests
   themselves are done: both platforms report phases, verified on a device and an emulator.
2. **Send the timeline, not the durations.** The waterfall places each phase where the ones before it
   ended, and now prints that start as a number — but the platform reports durations, and butting them
   together assumes the phases are contiguous. They are not: on a real request the phases sum to
   1003 ms against a duration of 1114 ms and a JS-measured wait-to-first-byte of 889 ms, so roughly
   97 ms sits in gaps the stack does not attribute to any phase. iOS has every boundary as a date on
   the same transaction metrics, and OkHttp has a callback for each, so sending offsets instead of
   lengths would place every bar truthfully and let a gap read as a gap.
3. **Requests from a native HTTP client that never touches JavaScript.** Now the largest hole in
   capture rather than in display: a JSI client answers no patch, and the only way in is whatever
   observer API it publishes for itself.
4. **Capture requests made before the panel is set up.** Everything before `init()` is invisible,
   which is most of a cold start.
5. **The row's own size figure.** The two sizes are separated in the detail panel, but the size on the
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

- **The panels scroll with the rows, as the list's own header.** Pinned above a bounded list, an open
  filter panel — chips for type, status, method and source, then a search box, then six more controls
  under More filters — leaves a phone almost no list to look at, and the list is the point of the tab.
  So the settings panel, the filter panel and the overview strip are the list's header instead: they
  scroll away as you read down, and the toolbar that opens them stays put. The settings panel lost the
  scroll view it used to have for the same reason — a vertical scroller inside a vertical scroller is a
  fight over every drag. The header goes in as an _element_, never as a function: a new function each
  render is a new component type to `VirtualizedList`, which remounts the header and takes the focus
  out of the search box on every keystroke.
- **A filter is one field, and the chips are its presets.** The status chips write the same expression
  the field takes, rather than being a second status filter beside it — two of them would have to be
  reconciled, and `4xx` is exactly what a chip would set anyway. So a tap still answers "show me the
  failures" and typing answers `>= 400`, which no arrangement of bands can express.
- **An expression that cannot be read filters nothing, and says so.** Half of `>=` is on the way to a
  filter, and emptying the list under the cursor reads as the panel being broken rather than as the
  filter being incomplete. So an unreadable expression or threshold is ignored and its field turns red
  — the same treatment the search box already gives an unfinished regex. The same reason the
  thresholds take units: `20kb` is what someone would say, and `20480` is what they would have to work
  out first.
- **A filter an entry has no figure for excludes it.** A socket has no size and no status code, a
  request in flight has no duration yet, and none of them is "under 20 kB" — letting them through
  would make a threshold mean "or unknown", which is not what was asked. Sorting takes the opposite
  view of the same fact: what cannot be compared keeps its order at the end, because a pending request
  at the top of "slowest first" would read as the slowest one rather than as an unknown.
- **Sorting is in Settings, and its direction is on the toolbar.** The key is chosen rarely and the
  direction is flipped constantly, so they live where each is reached: beside grouping and row density
  for the one, and on the arrow that was already there for the other. The arrow's label is written in
  the vocabulary of the key rather than as "ascending" — "Slowest first" is a direction someone can
  picture, and the direction of a size is not the direction of a clock.
- **The switches name the traffic, not the transport.** `http`, `websocket` and `sse` — a request is a
  request whether it left through `fetch`, through Expo's own fetch, through `XMLHttpRequest`, from a
  JSI client or from inside a page, and someone turning requests off means all of them. The old flags
  were named after the mechanisms instead, which put this package's five capture paths in the
  consumer's config and left `sse` with nowhere to go: it has no path of its own on the app's side at
  all. Turning streams off is the one switch whose effect differs by where the stream came from, for a
  reason that is not a compromise: the app's own stream is still recognised — its endless body has to
  be, or it would be read as a response — so its row stays and only the events are dropped, while a
  page's stream exists only through the wrapper this injects, so that one disappears with the wrapper.
  A JSI client is the other asymmetry: one observer reports both of its kinds, so it is told which are
  wanted rather than being attached for one and not the other.
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
- **XML is shown as a tree, parsed here rather than by the platform.** React Native has no
  `DOMParser`, so a browser panel's approach — hand `documentElement` to a renderer — is not available.
  The parser is small on purpose: it answers what a response viewer asks, and is not a validator, so a
  document that will not parse says why and leaves the raw body to be read instead. Whitespace between
  sibling elements is dropped as the indentation it is, while text with anything else in it survives so
  mixed content keeps its fragments; CDATA is kept apart from text and never decoded, since that block
  is the one place markup is deliberately not markup.
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
- **A page measures its own requests better than either native stack does.** A WebView page has the
  real `PerformanceResourceTiming` — the one React Native only stubs — so a request from a page reports
  DNS, TCP and TLS from the engine that performed them, along with `encodedBodySize` and
  `decodedBodySize` for the compression pair. Zero means "not available" in that API rather than "took
  no time": every detailed field is zeroed for a cross-origin response whose server sent no
  `Timing-Allow-Origin`, so a zero is dropped the way an unmeasured phase is dropped everywhere else.
  There is no `requestEnd` in that API, so a page's request has no sending phase and its wait contains
  the sending instead. When every field is zeroed — which is most third-party traffic — the entry says
  nothing about the inside of the request, so nothing is relayed at all: the page times its own request
  from JavaScript instead, the way the app's patches do, and the tab shows those two numbers rather
  than an empty waterfall claiming the engine measured something.
- **A page's cookies are the page's, not the request's.** `document.cookie` is all a page can read: the
  engine writes the `Cookie` header itself and forbids JavaScript from seeing it, and an HttpOnly
  cookie is invisible to a document by design. So it is stored in a field of its own and shown under
  its own heading, never merged into the request headers where it would read as what was sent.
- **A page's `EventSource` needs no wire parsing, and one thing about it cannot be known in advance.**
  The engine has already turned `text/event-stream` into events, so the wrapper listens rather than
  parses. But a _named_ event is only delivered to a listener that asked for that name — so the page's
  own `addEventListener` is wrapped too, and a name it subscribes to is watched from then on. An event
  type nobody in the page listens for is not reported, because nothing in the page received it either.
- **A page's socket is wrapped, never subclassed.** The injected script replaces the page's
  `WebSocket` with a function that hands back a real one and points its own prototype at the original,
  so `socket instanceof WebSocket` stays true whichever of the two the page checks — and the statics
  come across too, because they are read as `WebSocket.OPEN` rather than off an instance. The
  interception is read-only: the throttle and offline switches apply to requests, and a frame the panel
  delayed would be a lie about how the page behaves.
- **The page counts its own sockets, and this side names them.** A relayed event carries the page's
  counter, and the row id is built from that plus the source — so every event of one socket finds one
  row without a page ever being handed an id of ours to quote back.
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
- **The listener goes in with the application, not with `init()`.** Android's phases come from an
  OkHttp `EventListener`, installed by replacing the client factory `OkHttpClientProvider` hands out —
  which has to happen before anything asks for a client. Installed from JavaScript it reported a
  successful install and then delivered nothing at all, because by the time JavaScript runs, startup
  has already asked. So the package ships a `Package` class whose `ApplicationLifecycleListener` does
  it from `Application.onCreate`; autolinking finds that class by its name and its import, with no
  configuration for a consumer to add. One factory covers both `XMLHttpRequest` and Expo's own fetch,
  since `ExpoFetchModule` derives its client from the same provider.
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
- **One account of a request, never two.** Where the platform measured the phases, they are the whole
  of what the Timing tab shows. The patches can time a request too — call to headers, then the rest —
  but they start at a different moment and so can never agree: a JavaScript "wait" contains the queue,
  the handshake and the send, while the platform's contains none of them. Showing both put two rows
  named Waiting side by side with different figures, which reads as one of them being broken rather
  than as two vantage points. The patches' numbers are the fallback now, for every request nothing
  measured the inside of — a build without the native module, a platform not yet hooked, and a page's
  request its own engine will not describe. Both halves are measured wherever a request has a moment
  the headers arrive at: `fetch` resolving, and an `XMLHttpRequest` reaching `HEADERS_RECEIVED`, inside
  a page exactly as in the app. A JSI client is the one path with neither — its observer reports a
  start, an end and nothing between them — so those rows have a duration and no split, which is what
  that observer knows rather than something withheld. And a phases block with no phase in it is not
  phases: it takes the fallback, because a waterfall of no bars over numbers that do exist is a worse
  answer than the numbers.
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
- **The wire count comes from below the decoder, and each platform reports a different half.** iOS
  has both counts on the same transaction metrics the phases come from. Android's event listener sits
  below OkHttp's transparent gunzip, so what it counts is bytes off the socket — taken for the decoded
  size at first, which made every Android response look uncompressed: the response iOS measured as
  4,010 on the wire and 24,311 after decoding arrived here as 4,005 twice over. So Android sends the
  wire count alone and the decoded size comes from the body JavaScript already stored. That also means
  no interceptor is needed there — a chunked response carries no `Content-Length` to read anyway, and
  the listener's own count is the number that was wanted.
- **A phase that was not measured is absent, not zero.** A reused connection has no DNS, TCP or TLS
  phase at all, and three zeroes would read as a handshake that took no time — so the row says the
  connection was reused and shows only what happened.
- **Throttling is simulated in JS, and the two directions are not mirror images.** A download is
  throttled by _withholding_ what has already arrived, which is a real wait in the right place. Nothing
  can be withheld on the way out — by the time a patch could act, the bytes are gone — so an upload is
  modelled by holding the request back before it is sent, billed against the body's own size at the
  uplink speed. Latency is charged once, on the download side, because it belongs to the round trip
  rather than to either half. Nothing about any of it slows the native socket down.
- **A JSI client is read, not intercepted.** `react-native-nitro-fetch` touches neither `fetch`, nor
  `XMLHttpRequest`, nor React Native's networking, so no patch here can see it — and none is needed,
  because it publishes a `NetworkInspector` of its own. Its entries arrive complete rather than as a
  request and then a response, which is why such a row never shows progress, and why the throttle and
  offline switches do not reach that traffic: nothing here stands in front of it to delay.
- **An export says what it is.** The file carries a schema version, the tool that wrote it, and a
  summary, so one read years later is not a guess. Every kind of entry is in it now — a socket with the
  messages that belong to it, a stream with its events — which used to be dropped: the export filtered
  to plain requests, so a socket never appeared and a stream arrived without the events that are its
  body. Response _bytes_ are the one thing deliberately left out, since a base64 copy of a video makes
  a file nothing will open.

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
- **Tools for something outside the app to read the log with.** A coding agent asking what the app
  just requested is a real use, and the reason it is not here is the same property that makes `init()`
  the whole production story: the panel is in the app's own process and nothing outside it can be
  addressed. Exposing the log would mean a channel to a dev server, which this package does not have
  and does not want — a tool that needs one is a different tool, not a tab.
