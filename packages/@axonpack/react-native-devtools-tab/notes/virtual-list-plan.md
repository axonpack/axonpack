# Virtual list plan

A list for tabs that can hold tens of thousands of rows. The browser decides which rows are in
view, because only the browser can see the scroll position. The app renders only those rows, plus a
band around them, because rendering is the app's job. The first user is `@axonpack/expo-devtools`'s
Network grid, so that its log can drop the 200-entry cap.

Written 2026-09-24, after a `FlatList` was tried in that grid and failed.

## Business flow

- [ ] A tab author writes a long list the way they would write a `FlatList`: the data, a row
      height, and how to draw one row.
- [ ] Scrolling that list in DevTools is as smooth as scrolling a short one, however many rows it
      has.
- [ ] Opening the tab on a long list is as quick as opening it on a short one.
- [ ] A fast scroll past the drawn rows shows empty rows for a moment, never a jump and never a
      wrong row.
- [ ] A new row arriving at the top does not move what the user is looking at.
- [ ] The Network grid looks and behaves exactly as it does today, with the same columns, stripes,
      groups, selection and row menu.
- [ ] The Network log keeps every request until it is cleared.

## Reference behaviour

Chrome's own Network panel is virtualised the same way: it builds DOM only for the rows in view. So
a browser find (Ctrl+F) that cannot see off-screen rows matches what Chrome does already.

Shopify's remote-ui and remote-dom are the model for the split. The remote side runs React, and
the host side provides a few components of its own that the remote side uses by name.

Not mirrored:

- **`FlatList`'s API in full.** No `onEndReached`, no `getItemLayout`, no sticky headers, no
  `initialScrollIndex`. One fixed height for every row is the whole layout contract.
- **Measured row heights.** A measurement would be one more round trip for every row. Fixed
  heights let both sides compute the same layout from one number.

## Architecture

### Why not `FlatList`

It was tried on 2026-09-24. `VirtualizedList` decides what to draw from `onScroll` offsets,
`onLayout` sizes and `measure` on its scroll ref, and none of those reach the app. Events cross as
`{ type, target: { value, checked } }`, and a ref's `measure` answers zeros. So it drew its first
batch and stopped. Its wrapper `View`s also broke the Network grid's subgrid columns and its
stripes. Before that, `logs/@axonpack/expo-devtools/2026-09-22-0001-a-tab-in-react-native-devtools.md`
had already recorded a second failure: its list header props carry a fiber that cycles when a commit
is serialised.

### One host element, two halves

**App side, `VirtualList` (exported from `.`).** It holds the current band (`start`, `end`) in its
own state. It renders a host element named `devtools-virtual-list` with `count`, `itemHeight`,
`start` and an `onRange` handler, and only the rows for `data.slice(start, end)` as children. The
reconciler already accepts any string type, so nothing in the sender changes.

**Browser side, in `RemoteTree`.** `componentFor` maps `devtools-virtual-list` to a real browser
component before the lowercase-means-HTML rule applies. That component:

- finds its nearest scrolling ancestor. In the Network grid that is `.axonpack-net-body`, not the
  list itself.
- listens to `scroll` and a `ResizeObserver`, and works out which indices are in view from
  `scrollTop`, the viewport height and `itemHeight`.
- renders a top spacer of `start * itemHeight`, the children it was sent, and a bottom spacer for
  everything after them. The spacers keep the scrollbar the full length.
- calls `onRange(first, last)` when the view gets near the edge of the band it has. That is a plain
  function prop with numbers as its arguments, so it travels on the existing action message. **No
  new message type is needed.**

**Without `onRange` wired, the browser windows the children it was sent.** That is step 1 below and
a useful mode of its own: every row still renders in the app, but the DOM stays small.

**Report the range at most once per frame, and only when it leaves the band.** A report on every
`scroll` event would flood the channel. The band is the viewport plus about two viewports on each
side, which is also what hides the round trip on a normal scroll.

**The browser must never draw a child at the wrong index.** The app's answer to a range report
arrives after the user has scrolled on. The browser places children by the `start` prop that came
with them, not by the range it last asked for, and fills any gap with empty rows.

### The Network grid (`@axonpack/expo-devtools`)

- **Groups become items in one flat list.** A header is an item like a row. Today's per-group
  `div` wrappers are subgrids, and they go.
- **Group headers take the row height.** `.axonpack-net-group` is a fixed 21px, and big rows are
  41px. One height for every item is the layout contract, so the header follows `--net-row`.
- **Stripes come from the row's own index.** `:nth-child(even of .axonpack-net-row)` counts the
  rows in the DOM, so its parity would flip every time the band moved. Each row gets `data-odd`
  from its position in the whole list, and the rule reads that instead.
- **The host element is `display: contents`.** Rows stay direct items of `.axonpack-net-grid`, so
  the subgrid columns, the column resizers and their `:has()` drag rules keep working.
- **`RequestRow` is wrapped in `memo`.** A new request then renders one row, not the whole band.

**Filtering and sorting still run over the whole log on every change.** Virtualisation does not
touch that. It is the cost left once rendering is solved. At tens of thousands of entries, memoise
the filtered and sorted list on the log's version.

**Memory is the other cost left.** Bodies are kept whole, so an unlimited log grows until it is
cleared. That is the trade chosen for this package, not a bug to fix here.

## Order of work

1. [ ] **Browser-side windowing.** Add the host element to `RemoteTree` with windowing over the
       children it was sent. Ends with: a test tab rendering 5,000 fixed-height rows that scrolls
       with about 60 row elements in the DOM.
2. [ ] **Range reporting and `VirtualList`.** Wire `onRange` and export the app-side component.
       Ends with: that tab rendering only its band in the app, and a panel opened on it replaying
       only the band.
3. [ ] **The grid adopts it.** Flat items, header height, `data-odd` stripes, `display: contents`,
       `memo` on `RequestRow`. Ends with: the Network tab looking the same as today at 200 entries.
4. [ ] **The cap goes.** Remove `MAX_ENTRIES` from the network log store, and update `CLAUDE.md`
       and the docs site's Network page, which says "the most recent 200". Ends with: 20,000
       requests from the example app, scrolled end to end in DevTools.
5. [ ] **Documented.** A "Long lists" section in this package's README, and a changeset for each
       package.

## Not in this plan

- **Variable row heights.** Each row would need measuring in the browser and reporting back. Fixed
  heights cover every list a devtools tab has asked for so far.
- **The in-app panel.** It already uses a real `FlatList`, which works on the device.
- **Horizontal windowing.** The grid has six columns.
- **Scrolling to a row from the app** (a `scrollToIndex`). Nothing asks for it yet.

## Open decisions

- **Scroll anchoring on a new row.** New requests go in at index 0 and push everything down one
  row. The browser's `overflow-anchor` should keep the view still, but it picks a visible element
  as its anchor, and the band's children are swapped as the band moves. Check in step 3. If it
  does not hold, the host component adds `itemHeight` to `scrollTop` itself whenever `start` stays
  the same and `count` grows while the user is scrolled down.
- **Unlimited or configurable.** Step 4 removes the cap outright, as decided. A
  `network.maxEntries` option would cost one line if someone wants a ceiling back later.
