# A tab in React Native DevTools, and the static panel deleted

`@axonpack/react-native-devtools-tab` reached 0.1.0 on npm, so this package now depends on it and
registers one tab, **Axon Network**: Chrome's Network panel, feature for feature with the on-device
tab. `withDevtools` is that package's Metro wrap under our name and nothing else.

`src/react-native-devtools-tab/` is that tab and nothing else. Nothing on a device imports it and
nothing in it is rendered on one, so the mobile panel cannot be affected by what the desktop needs.
What is shared is the store and the pure formatters, which is the point.

## The dependency is the published one

`^0.1.0` in `dependencies`, not `workspace:*`, and not `devDependencies`: `metro.config.js` requires
it when building for release too, so a release install that skips dev dependencies would throw
before Metro starts. bun links the workspace copy locally whatever the range says, which is fine
while the two are the same version.

## `panel/` is gone

It was an rsbuild workspace building a static page of network fixtures, served by the Metro wrap at
`/axonpack-panel`. It had been dead in every published install since it was written: `dist` was never
in `files`, so the page the route read was never in the tarball. The route, `PANEL_ROUTE`, the
workspace entry and the turbo task went with it.

## Why the tab is written again rather than reused

Rendering `DevtoolsPanel` in the tab was tried first and fails with `TypeError: cyclical structure in
JSON object` the moment the panel opens.

`VirtualizedList` spreads its own props onto the `ScrollView` it renders, so `ListHeaderComponent`,
`ListEmptyComponent` and `ListFooterComponent` arrive as host props. Given an element rather than a
component, each carries a fiber on `_owner`; a fiber cycles through `return.stateNode`; and the tab
package serialises a whole commit in one message, so one of them takes every op in that commit with
it and the tab draws nothing.

Found by rendering the panel through `createRemoteSender` and stringifying each commit, which needs
one React copy for both the reconciler and the components: bun links react 19.2.3 into the tab
package and 19.2.8 here, and without a `moduleNameMapper` forcing one, hooks come back null and
nothing renders at all.

Passing components instead of elements would fix the cycle and remount every list header on every
render, taking the focus out of the search box in it. The tab package's `sendable` also documents
the rule it does not enforce: a value that cannot survive JSON should be skipped, not sent. Both are
worth doing and neither is needed here, because a request list in a browser wants a `table` and a
`table` has none of this.

The other two limits are smaller and known: icons cross as text in a font family the panel page has
never heard of and draw as empty boxes, and a tab is its own React root, so safe-area insets are zero
and a modal lays out inline.

## The tab is UI only

Everything below the UI is the device's, unchanged: `matchesFilters`, `sortEntries`,
`compileNetworkFilters`, `buildMatcher`, `layOutPhases`, `resolveResponseSizes`, the cookie and XML
parsers, the cURL and fetch builders, `buildNetworkExport` and `sendSandboxRequest`. Every one is a
pure function over the same store, so the two panels cannot disagree about what a filter means.

Three things a browser does better than a WebView on a phone, and the tab takes them: a page previews
in an `iframe` with `sandbox=""`, a binary body gets a hex dump beside its base64, and the columns
sort by being clicked.

Three it does worse, all the same cause — a `ref` in a tab holds a stand-in, so there is no element
to click or measure. Copying and saving a body both need one, so Snippets and Export show the text to
select; and dragging a range across the overview strip needs one, so a bar is clicked instead.

Every text input in the tab is uncontrolled. A controlled `value` would send each keystroke to the
device and wait for it to come back before the caret moved, and every toggle is a button for the same
reason: a checkbox shows the old state until its round trip lands.
