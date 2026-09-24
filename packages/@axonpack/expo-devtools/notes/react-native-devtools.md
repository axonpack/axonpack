# React Native DevTools tab

An **Axonpack** tab in React Native DevTools, beside Console and Sources, drawn by a component
that runs in the app.

- [x] With the dev server running, opening React Native DevTools shows an Axonpack tab.
- [x] Chrome's Network panel, feature for feature with the on-device tab: the toolbar, the filter
      and settings drawers, the overview strip, the sortable list and the detail pane.
- [x] Search with regex, case and whole-word modes, inverted, with the matches marked.
- [x] Filter by type, method, source, a status expression, size and duration; in flight only,
      intercepted only, hide data URLs, hide failed.
- [x] Dense rows, grouping by client, the overview strip, and sorting by time, size, duration or
      status from the column headers.
- [x] Throttling presets, which are the device's own and change what the app really does.
- [x] Detail: Headers, Payload, Preview, Response, EventStream, Timing, Cookies and Initiator, plus
      Messages for a socket.
- [x] Preview draws an image, a page and an SVG, and lays out XML as a tree; Response carries both
      sizes.
- [x] Initiator symbolicates against the dev server and shows the source around the line.
- [x] Block a URL from the row menu.
- [x] Copies land on the computer's clipboard, and a response body downloads as a file.
- [x] Answer a request yourself with an override.
- [x] Edit any request in the sandbox and send it again for real, laid out like a web API client.
- [x] The request as code in nine languages.
- [x] A custom throttle speed, and the user agent.
- [x] Stacked header values.
- [x] A hex dump of a binary body.
- [x] Open DevTools on the Axonpack tab from the app's own panel.
- [x] The whole log as the export file, and every count as the device counts it.
- [x] Reading on the desktop changes nothing on the device: the on-device panel still opens, still
      records, and still works with the dev server gone.
- [x] An app that does not opt in sees no tab and no change at all.
- [x] Dragging a range across the overview strip, from strips the page draws, with no measurement.
- [ ] The rest of the panel: console, storage, performance and crashes.
- [ ] A prompt box in the tab answers questions about the project on the developer's machine.
- [ ] A captured request, log or crash can be handed to that prompt in one click.

## There is no second front end

A tab is a React component that runs **in the app**, against a renderer that reports what it drew;
the panel builds the real elements from the changes that arrive and draws them with
react-native-web. So a tab is not a copy of the panel. It reads the same stores because they are the
same objects, and a button in it runs the same function.

That is why `@axonpack/react-native-devtools-tab` exists and why this package is a plain consumer of
it: `withDevtools` is that package's Metro wrap under our name, and the device side is one
`registerTab` call.

**This replaces a plan that was most of a second product**: a bridge subscribing to every store, a
mirror store behind an alias per module, a separate web build under `panel/`, bodies fetched by id
to keep messages small, and a rule that the desktop was read-only. None of it is needed once the tab
is a component running in the app. All of it is gone, `panel/` included.

## The tab is written for a browser, not reused from the device

`src/devtools-remote-tab/` holds the tab and nothing else, in `div` and `table`. Nothing in it
is rendered on a device and nothing on a device imports it, so the mobile panel is untouched by
whatever this needs.

**What is not written again is any of the thinking.** `matchesFilters`, `sortEntries`,
`compileNetworkFilters`, `buildMatcher`, `layOutPhases`, `resolveResponseSizes`, the cookie parser,
the XML parser, the cURL and fetch builders, the export file and `sendSandboxRequest` are all the
device's, unchanged, because every one of them is a pure function over the store. Two panels, one
implementation, and a filter that behaves differently on one of them would be a bug in both.

A browser is also better at three things than a WebView on a phone, so the tab does them: a page
previews in a sandboxed `iframe`, a binary body gets a hex dump, and the columns sort by being
clicked.

Host output crosses, so a component whose behaviour is native code does not bring that behaviour.
The first of these is why the panel's own views are not what the tab draws:

- **A `FlatList` cannot cross.** `VirtualizedList` hands its `ListHeaderComponent`,
  `ListEmptyComponent` and `ListFooterComponent` straight down to the `ScrollView` it renders. Given
  an element, each carries a fiber on `_owner`, a fiber is a cycle, and the tab package serialises a
  whole commit at once, so one of them takes every op in that commit with it. The app reports
  `TypeError: cyclical structure in JSON object` and the tab draws nothing. Every list view in this
  package passes elements, and passing components instead would remount the header on every render
  and take the focus out of its search box. So the tab draws a `table`, which is what a browser had
  all along.
- **Icons draw as empty boxes.** They cross as text in `MaterialIcons`, a family the panel page has
  never heard of. Nothing in the tab uses one.
- **Insets are zero and a modal lays out inline.** A tab is its own React root with no native view
  behind it, so nothing measures and nothing is raised.

## Two gates, unchanged

`config.enabled` still decides whether anything records, and the record button in each toolbar is
still `paused`. The tab is a third reader of the same stores, not a third gate.

Registration is gated on `__DEV__` rather than on `config.enabled`, because a release build has no
DevTools to connect to at all. It is a compile-time constant, so the whole thing folds away in one.

## Won't do

- **Replacing the on-device panel.** The device stays the one that works with no dev server, which is
  the whole reason this package exists.
- **Publishing the tab separately.** One package, one extra export.
- **Lynx and Re.Pack.** Neither is tested.
