# Reference

Every control, section and field in the panel, and the whole public API. The
[guides](https://axonpack.github.io/docs/expo-devtools) are the tour; this is the map.

This file ships inside the package. The same reference, split into pages and searchable, is at
[axonpack.github.io/docs/expo-devtools/reference](https://axonpack.github.io/docs/expo-devtools/reference).

- [The panel](#the-panel)
- [Network tab](#network-tab)
- [Console tab](#console-tab)
- [Performance tab](#performance-tab)
- [Storage tab](#storage-tab)
- [React Native DevTools tab](#react-native-devtools-tab)
- [API](#api)
- [What needs a development build](#what-needs-a-development-build)

Throughout: **dev build** means the feature reads this package's native module, so it is dark in Expo
Go and lights up in a build made with `expo run:ios` / `expo run:android` or EAS. Nothing in the
panel crashes without it: the control says what it needs instead.

---

## The panel

`<DevtoolsProvider>` renders a draggable floating button beside your app. Tapping it opens a
full-screen modal; the button itself never appears inside the modal. With
`showFloatingButton={false}` there is no button and `useDevtoolsPanel()` is the way in.

### Header row

| Item         | What it does                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab bar      | **Network**, **Console**, **Performance**, **Storage**, **Crashes**, **Debug**. Scrolls horizontally on a narrow screen.                                   |
| Error badge  | A red count on the Console tab when it isn't the active tab, showing captured `console.error`s. The Crashes tab carries the same badge for unread reports. |
| Palette (🎨) | Opens the theme list; the active one is ticked. Applies immediately.                                                                                       |
| Close (✕)    | Dismisses the panel. Recording carries on while it's closed.                                                                                               |

In a debug build whose bundle came from Metro, a strip under the header says **Metro server
detected**. Its **Open DevTools** button opens React Native DevTools on the Axonpack tab, the same
window the dev menu opens. A release build, or a bundle built into the app, has no strip.

The tab you last had open is remembered for the life of the app process, so reopening the panel
returns you to it. Only the active tab is mounted, so switching tabs and back resets that tab's
filters, its open detail sheet and its scroll position. Captured data is untouched: it lives in the
stores, not the views.

A detail sheet slides up from the bottom and closes with its ✕, a tap outside it, or a drag of its
handle or header down. With the keyboard up the sheet grows to make room, up to just short of the top
of the panel, and its content scrolls in what is left.

### Toolbar row

On the three tabs that record — Network, Console, Performance — it opens with the same two controls:

| Control    | What it does                                                                         |
| ---------- | ------------------------------------------------------------------------------------ |
| Record (⏺) | Pauses and resumes **capture** for that tab. Red when recording, hollow when paused. |
| Clear (⊘)  | Throws away everything that tab has collected. Not undoable.                         |

Not every tab has one. Storage has no record button, on purpose: it reads on demand rather than
recording, so there is no stream to pause, and a clear button there would mean wiping your storage
rather than dropping a log. It opens with Refresh instead. Crashes has a clear button but no record
button — a crash is not a stream you can afford to have switched off. Debug has no toolbar at all:
nothing there records or collects.

Pausing and `enabled` are different switches, and the difference matters when you ship: with
`enabled: false` nothing is patched, observed or recorded anywhere. The record button only pauses a
tab that a started client already turned on. There is no UI for `enabled`, which is the point of it.

`enabled` is the only gate, and it controls both **capture** and **access**: the provider installs
nothing and draws no button, so the mount can stay in a release build rather than being wrapped in a
condition of its own.

The one thing it keeps rendering is the crash report sheet, which is meant to work in production; see
`crash.enableWhileDevtoolsDisabled` for capturing without the rest of the devtools.

---

## Network tab

Three capture paths feed one list: `fetch`, `XMLHttpRequest` (which is what catches axios and most
HTTP client libraries), and any `<WebView>` you wired up. The list holds the **1,000** most recent
requests; older ones fall off the end. Request and response bodies are kept in full, never truncated.

### Toolbar

| Control         | What it does                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Record / Clear  | As above.                                                                                                    |
| Sort (↑ / ↓)    | Flips the direction of whatever **Sort by** is set to. Its label says what pressing it would give you.       |
| Filter (⌕ list) | Opens the filters panel below.                                                                               |
| Export (⤓)      | Opens the OS share sheet with the **currently filtered** list as JSON, named `network-log-<timestamp>.json`. |
| Settings (⚙)    | Opens the settings panel below.                                                                              |

### Filters panel

| Field                        | What it does                                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search box                   | Matches method, URL, status code and source, not header or body text. Clear it with the ✕ inside the box.                                                                              |
| **Invert** chip              | Shows everything that does _not_ match the search text.                                                                                                                                |
| **Type** chips               | `All`, `Fetch/XHR`, `JS`, `Img`, `Media`, `Other`. Fetch/XHR is every request sent through `fetch` or `XMLHttpRequest`, whatever came back; the others go by the response's MIME type. |
| **Status** chips             | `All` plus one per band captured (`2xx`, `4xx`, `Failed`, `Pending`). Each one writes the field below.                                                                                 |
| Status expression            | `404`, `4xx`, `>= 400`, `200-299`, `failed`, `pending`. Unreadable text turns the field red and filters nothing.                                                                       |
| **Method** chips             | One per method actually captured (`GET`, `POST`, …), and more than one can be on at once. `All` clears them.                                                                           |
| **Source** chips             | One per source seen — your app, or `WebView::[name]` per declared browser view — and again multi-select.                                                                               |
| More filters ▸               | Reveals the rest, below.                                                                                                                                                               |
| Size: at least / at most     | Bytes, or with a unit: `500`, `20kb`, `1.5mb`.                                                                                                                                         |
| Duration: at least / at most | Milliseconds, or with a unit: `250`, `800ms`, `1.5s`, `2min`.                                                                                                                          |
| Only requests in flight      | Keeps just the ones that have not finished.                                                                                                                                            |
| Only overridden or blocked   | Keeps just the ones a rule of yours answered.                                                                                                                                          |
| Hide data URLs               | Drops requests whose URL starts with `data:`.                                                                                                                                          |
| Hide failed requests         | Drops requests that errored (network failures, not 4xx/5xx responses).                                                                                                                 |

Every filter combines with the search. **Invert** negates all of them together except the two `Hide`
switches, which stay absolute — inverting those would bring back the exact noise they suppress. A
filter an entry has no figure for excludes it: a socket has no size or status code, and a request in
flight has no duration yet.

### Settings panel

| Setting               | Default        | What it does                                                                                               |
| --------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| Large request rows    | On             | Off gives compact rows: no short name, no badges, URL as the primary line.                                 |
| **Sort by**           | Time           | `Time`, `Size`, `Duration`, `Status`, plus the direction the toolbar's arrow also flips.                   |
| Group by fetch client | Off            | Groups rows under a header per source, with a count per group.                                             |
| Show overview         | Off            | Shows the traffic graph above the list.                                                                    |
| Stack header values   | On below 768dp | In the detail sheet, puts each header's value under its name instead of beside it.                         |
| **Throttling**        | No throttling  | `No throttling`, `Slow 3G`, `Fast 3G`, `Fast 4G`, `Offline`, `Custom`.                                     |
| **User agent**        | Default        | `Default`, `iPhone Safari`, `Android Chrome`, `Chrome (macOS)`, `Chrome (Windows)`, `Googlebot`, `Custom`. |

Throttle profiles, as applied to your app's own requests and to wired-up WebView pages:

| Preset  | Download                 | Latency                                    |
| ------- | ------------------------ | ------------------------------------------ |
| Slow 3G | 400 kbps                 | 2000 ms                                    |
| Fast 3G | 1638 kbps                | 563 ms                                     |
| Fast 4G | 9000 kbps                | 85 ms                                      |
| Offline | none                     | requests fail immediately                  |
| Custom  | your **Download (kbps)** | your **Latency (ms)** (defaults 750 / 500) |

Picking **Custom** under User agent reveals a free-text field for the whole UA string. Every captured
request records the conditions it ran under, so the detail sheet can show them later.

### Overview strip

Shown when **Show overview** is on, and only once at least one request is captured.

- 36 buckets spanning the oldest to the newest captured request; bar height is request count.
- A bucket containing a failed request is drawn in the error colour.
- Tap a bucket to narrow the list to that slice of time; tap it again to clear.
- The row underneath shows the first timestamp, the selected span, and the last timestamp.

### A request row

| Element         | Meaning                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------- |
| Method          | Colour-coded per verb.                                                                       |
| Status          | The HTTP code, or the error text, or an amber **PENDING** while still in flight.             |
| Duration · time | Total ms and the wall-clock start. A dash until it finishes.                                 |
| Type icon       | Per response kind; JSON gets its own glyph.                                                  |
| Name            | Last path segment plus the query string (large rows only).                                   |
| URL             | Full URL, one line on large rows, two on compact.                                            |
| Badges          | Resource type · source (only when it came from a WebView) · response size (large rows only). |
| ⋮               | The copy menu, also on long-press anywhere in the row.                                       |

The row menu: **Try in sandbox**, then **Copy URL**, **Copy as cURL**, **Copy as fetch**, **Copy as
fetch (Node.js)**, then **Copy request payload** and **Copy response** when those exist, **Share
response body** when there is a body at all, then **Block this URL** and **Override response…**.

### Detail sheet

Tapping a row opens a sheet with up to five tabs. It always opens on **Headers**.

**Headers**

| Section            | Fields                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| General            | Request URL, Request Method, Status Code, Source (only for WebView traffic).                                  |
| Network Conditions | Throttling, User Agent, and Agent String when an override was active. Amber when throttled, red when offline. |
| Request Headers    | Every header sent, with a per-value copy button. Count in the section header.                                 |
| Response Headers   | Every header received, same treatment.                                                                        |

**Payload**: the request body as an explorable JSON tree. The tab is hidden entirely when the
request had no body.

**Preview**: the response rendered: pretty-printed and syntax-coloured JSON, a real image for image
responses, HTML as HTML. Falls back to `No preview available`.

**Response**: the raw response body, in full, with a copy button.

**Timing**: Started At and Duration (`(pending)` while in flight), plus a note that a
DNS/TCP/TLS/TTFB breakdown isn't observable from JS, since those phases happen in the native
networking stack.

The sheet's ⋮ menu is the same list without **Override response…**.

### Sandbox

Opens the request as something editable, seeded from what was captured: URL, method, query
parameters, headers, cookies, auth and body all split into their own fields.

| Area             | What's in it                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL bar          | The base URL, without the query string.                                                                                                                                     |
| Method chips     | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.                                                                                                                                    |
| Send             | Fires the request and switches to the Response tab.                                                                                                                         |
| **Request** tab  | Authentication · Query Parameters · Headers · Cookies · Body.                                                                                                               |
| **Response** tab | Status code and text, colour-coded, with the round trip in ms; Response Headers (with count); Response Body. A failed request shows `Request failed` and the error instead. |

Authentication offers `none`, `bearer` (a **Token** field) and `apikey` (a header-name field, e.g.
`x-api-key`, and a **Value** field). Query parameters, headers and cookies are key/value tables that
grow a blank row as you fill the last one. Cookies are recombined into one `Cookie` header on send.

Sandbox requests go out through the same patched `fetch`, so they appear in the log like any other
request.

---

## Console tab

Mirrors `console.log` / `.info` / `.warn` / `.error` / `.debug`, plus output from wired-up WebView
pages. Holds the **500** most recent rows.

### Toolbar

| Control           | What it does                                                                    |
| ----------------- | ------------------------------------------------------------------------------- |
| Record / Clear    | As above. The `>` prompt still answers while capture is paused.                 |
| Filter (⌕ list)   | Opens the filters panel.                                                        |
| Warn/error counts | On the right: a live count of captured warnings and errors, each in its colour. |

### Filters panel

| Field            | What it does                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Search box       | Matches the rendered text of a message.                                                           |
| **Level** chips  | `All (n)`, `Logs (n)`, `Info (n)`, `Warnings (n)`, `Errors (n)`, `Debug (n)`. Counts are live.    |
| **Source** chips | One per source, shown only when more than one source has logged (i.e. once a WebView reports in). |

### A console row

| Element    | Meaning                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Level icon | Info, warning, error and debug get a glyph and colour; warnings and errors tint the whole row.                                                          |
| Arguments  | One cell per logged argument, so a message and its object stay apart. Objects and arrays render as a collapsed JSON tree; tap to expand level by level. |
| Error      | The message on the row; tap to expand the full stack.                                                                                                   |
| Source     | `WebView::[name]` for browser-view output; absent for your app's own.                                                                                   |
| ×n         | Repeat count. Consecutive identical messages from the same source collapse into one row.                                                                |
| Time       | Wall-clock time of the most recent occurrence.                                                                                                          |
| Copy       | Copies the row's text.                                                                                                                                  |

The list follows the newest output and stops following the moment you scroll back, with a ⌄ button
to jump to the newest again.

### The `>` prompt

Present when the REPL is enabled through `console.repl`, which defaults to `__DEV__`.

- Type an expression and submit: your input appears as an `input` row (`›`), the result as a `result`
  row (`‹`). Objects come back as the same explorable tree.
- A returned promise shows as pending and fills in when it settles.
- **Suggestions** appear as chips above the prompt as you type, including members of whatever object
  you're inside. Tap one to complete.
- **Tap any earlier input row** to load that command back into the prompt.
- `$modules('auth')` lists loaded Metro modules matching a string; `$m('src/stores/auth')` returns
  one. Both read Metro's module registry, which only a development bundle has, so in a release build
  they return nothing.
- Anything passed in `console.context` is in scope by name.

Your app's own imports are **not** reachable by name: a bundled module is a private closure, so there
is nothing for an expression to resolve. `context` is how you hand over the objects you want to poke
at, and it's the only route that works in a release build.

---

## Performance tab

The toolbar carries the record button, the clear button, then the section chips:

```
[⏺] [⊘] │ (Statistics) (User timing) (Interactions) (Long tasks)
```

Only the chosen section is mounted, which is deliberate: the charts stop re-rendering while you read
a list, and a burst of long tasks doesn't re-render a chart. The three list chips carry a live count
when they have entries.

This tab **starts paused** (`performance.disabledByDefault` defaults to `true`) because measuring
costs something. While paused the collectors are detached rather than left running and filtered, so a
paused tab costs nothing at all; pressing record attaches them fresh and re-reads whatever the
platform still has buffered. Every empty list shows the same **Not recording** panel with a _Start
recording_ button.

`performance.historySize` (default 120) caps the memory samples, long tasks, user timing entries and
interactions kept.

### Statistics

Four cards plus the startup breakdown.

**Frames per second**

| Field       | Meaning                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| JS thread   | Current frames per second from a `requestAnimationFrame` delta loop, sampled every 500 ms.                                            |
| Main thread | Current frames per second from a native display-link counter. Reads `dev build` without the native module.                            |
| Chart       | Both threads on one plot, one colour per thread, 60 buckets of 5 s, covering the **last 5 min**. Each bucket keeps its worst reading. |
| Axis        | Scaled to the confirmed peak (min 60) plus headroom, so a 120 Hz device isn't clipped.                                                |

The gap between the two lines is the reading that matters: a healthy JS line above a collapsed main
line is an app that feels frozen while every JS metric says it's fine.

**Interactions** (card): the slowest event-to-next-paint seen, with the average and the count as the
hint. Before anything is captured it reads `Slowest event to next paint`.

**Memory**

| Field               | Meaning                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JS Heap plot        | `performance.memory` used heap, captioned `of <total> allocated`. Reads `This JS engine doesn't report it` on JSC/V8.                                                                   |
| App memory plot     | Whole-process footprint, what the OS holds against you. Needs a dev build.                                                                                                              |
| Device memory meter | Used against total RAM, captioned with what is still available to this app. On Android that's system-wide free memory; on iOS it's what the process can still claim. Needs a dev build. |

Both plots are sampled on `performance.sampleIntervalMs` (default 1 s) and span `historySize`
samples, two minutes at the defaults. Each carries its own peak marker.

**Storage**: disk space, not the [Storage tab](#storage-tab)'s contents — a Used meter against the data
partition's total, captioned with the free space. Android only, and needs a dev build; the card says
which of the two is missing. iOS is absent on purpose:
`systemFreeSize` is one of Apple's required-reason APIs, and a library reading it would push a
privacy-manifest declaration onto every app that embeds it.

**Startup**: process start to first render, read once at launch. Up to two blocks:

| Block                    | Rows                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| Measured by this package | Total · Native startup · Bundle eval · App setup · To first render |
| Reported by the platform | Total · Native init · Runtime setup · Bundle eval                  |

The measured block comes from the native module's real process start time, so it works where the
platform's own markers are all null. Its phase boundaries are this package's own load points, so they
shift with where you mount the provider: _App setup_ ends when it first renders. The
platform block is `performance.rnStartupTiming`, and a dash means the platform never reported that
marker. The whole section is hidden when neither is available.

### User timing

Marks and measures you record yourself, newest first.

| Column   | Meaning                                                       |
| -------- | ------------------------------------------------------------- |
| Name     | The name you passed.                                          |
| Kind     | An icon, not a word: a pin for a mark, a ruler for a measure. |
| Detail   | Your `detail`, stringified, when you passed one.              |
| Time     | Wall-clock time it was recorded.                              |
| Duration | The measured span; a mark shows `—`.                          |

This is the only list here that can point at a specific piece of your code, which makes it the answer
to a long task you can't explain. See [`mark` / `measure`](#user-timing-1) below.

### Interactions

Anything slower than `performance.interactionThresholdMs` (default 100 ms) from event to next paint.

| Column      | Meaning                                          |
| ----------- | ------------------------------------------------ |
| Name        | The event type.                                  |
| handler Xms | How long your handler itself held the JS thread. |
| Duration    | Event to next paint, colour-coded by severity.   |

A small handler under a large total means the interaction was stuck behind something else rather than
being slow itself. The platform rounds durations to 8 ms and never reports anything under 16 ms.

### Long tasks

Stretches of JavaScript that ran without yielding for longer than
`performance.longTaskThresholdMs` (default **150 ms**), newest first: name, wall-clock time, and
duration colour-coded by severity. At 60 fps a frame is 16.7 ms, so 150 ms is about nine frames lost;
past ~200 ms it reads as a freeze.

A long task tells you _when_ to look, never at what: React Native's `PerformanceLongTaskTiming`
returns a permanently empty `attribution` array. Correlate against what the app was doing, or wrap
the suspect in `mark`/`measure`.

Both this list and Interactions show a note when the platform's own buffer overflowed and discarded
entries before the panel could read them.

## Storage tab

Every key in every store you registered, with its value, type and byte size.

```
[AsyncStorage 12 ▾] │ [⟳] [+] [Filter] │ [⤓] [⤒]
AsyncStorage  ·  Async  ·  read at 14:22:07
[12 keys] [4.1 KB] [cache/feed · 1.2 KB]
```

Unlike the other three tabs, this one **finds nothing by itself**. A key-value store is a separate
install with its own native code, and this package depends on none of them, so the stores arrive
through `storage.adapters` in the client config. With none registered the tab explains that and shows
the snippet to copy, rather than an empty list that would read as "you have no data".

### Toolbar

| Control            | What it does                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store dropdown (▾) | Which store the tab is showing, with its key count. Appears once a second store is registered; the menu ticks the active one and carries every store's count. |
| Refresh (⟳)        | Re-reads the selected store. This is where the record button is in every other tab.                                                                           |
| Add key (+)        | Opens a sheet to write a key the store doesn't hold yet: a name, a type the store accepts, and a value. Shown only for a store the tab can write to.          |
| Filter             | Opens the filter panel, at the top of the scrolling content. Pressing it also scrolls you back up to it.                                                      |
| Export (⤓)         | The currently-filtered entries as JSON through the OS share sheet, under a `schemaVersion`.                                                                   |
| Import (⤒)         | Paste a snapshot back in. Shows what it would do before writing anything. Shown only for a store the tab can write to.                                        |

Adding a key is a distinct operation from editing one, not an alias: the type is chosen rather than
inherited from a value that is already there, and a key the store already holds is refused rather
than quietly overwritten. The check asks the store, not the list on screen — a store the tab cannot
enumerate holds keys the list never had.

There is **no record button** — storage is a pull, not a stream, so there is no stream to pause. And
no clear button: that icon means "clear the log" in the other three tabs, and it must never come to
mean "wipe your storage". The tab reads on open and on Refresh; nothing polls.

### Import

There is no filesystem module in this package and no dev server to upload to, so a snapshot comes
back the way it left: as text. The sheet takes a paste (or reads the clipboard for you), then says
what the file would do before anything is written — how many keys are new, how many would be
overwritten, how many already hold exactly that value, and how many are skipped, with the reason:
hidden by the blacklist, a type this store does not hold, or no value to write. A file exported from
a different store is not refused, but it is called out.

Only then does the Write button do anything. Keys are written one at a time so a failure names the
key that caused it, and the store is re-read afterwards rather than patched key by key — an import
is the one write here big enough for the difference to matter, and a store is free to normalise
every value it was handed.

A file from a schema version this build does not read is refused outright, with the version it found.

### Store summary

The toolbar is the only pinned row. The summary and the filter panel are the list's header, so they
scroll away with the rows — an open filter panel would otherwise leave a phone with almost no list.

The summary names the store, whether it is `Async` or `Sync`, when it was last read, its key count,
total bytes and largest key — plus whatever needs saying honestly:

- `SecureStore can't list its own keys — showing the 2 you declared.`
- `Read 1,000 of 4,312 keys — the rest are past the cap.`
- `Read-only — values here cannot be edited or deleted.`

### Filters panel

| Section      | What it holds                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Header       | `n of m`, **Invert**, **Clear** — as in the Network tab.                                                                    |
| Search       | The shared search box, with match-case / whole-word / regex modes.                                                          |
| Search in    | **Keys + values**, **Keys**, **Values**. A key and its value are different haystacks.                                       |
| Type         | Object · Array · String · Number · Boolean · Binary · Empty · Missing, with counts. Only types actually present get a chip. |
| Sort by      | **Key**, **Size**, **Type**, plus an ascending/descending chip. Sorted by key within a type.                                |
| More filters | **Group by namespace**, **Hide empty values**, **JSON values only**.                                                        |

**Group by namespace** recovers the prefix conventions no store knows about — `auth:token`,
`cache/user/1`, `settings.theme`, `user_name` — splitting on the first of `:` `/` `.` `_` and grouping
under it. A key with no prefix lands under `Ungrouped`.

### A key row

The type glyph, the key, its size, and the value collapsed to one line. Matches from the search are
highlighted in both the key and the value. **Empty** and **Missing** are separate types on purpose: an
empty string is a value a store can hold, and conflating the two hides a real one. A key that failed to
read shows the reason in red instead of a value — SecureStore throws per key on a value it can't
decrypt, and losing the whole store to that would be the wrong trade. Long-press for the copy menu.

### Detail sheet

Tap a row for **Value**, **Raw**, **Edit** and **Info**, with a kebab menu of Copy key / Copy value /
Copy as JSON / Copy value (formatted), and **Delete key** when the store can delete.

| Tab   | What it shows                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Value | The same inspectable, syntax-highlighted `JsonTree` as the Network tab's Preview when the text parses as an object or array; monospace text when it doesn't. |
| Raw   | The characters exactly as stored — no parsing, no pretty-printing — with the character and byte counts.                                                      |
| Edit  | The value in an editable box, with Revert and Save.                                                                                                          |
| Info  | Key, store, how it is shown, how it is stored, size, read time, whether it can be edited or deleted.                                                         |

Value and Raw carry their own search box for looking inside one large value, the same one the Network
tab's detail sheet uses.

**Editing.** Save writes through the type the value was read as, so a number edited in a text box is
still a number to the store; a non-numeric edit of a numeric key is refused rather than silently
stringified. The key is then read back rather than assumed, because a store is free to normalise what
it was handed. Broken JSON in a value that was stored as JSON is a **warning, not a block** — a store
can legitimately hold text that was never JSON. Edit says why it is unavailable when it is: the store
is read-only, or was registered without a way to write, or the value is binary.

**Deleting** asks for confirmation first, and acts on exactly one key. There is no store-wide clear
anywhere in the tab, and no way to add a key that isn't already there.

### What this tab does not do

- **No mutation history.** Nothing patches the store instance you hand over, so the tab shows state,
  not the writes that produced it.
- **No SQLite.** A table needs schema, queries and paging, not a key list — that is the Database tab's
  job, and squeezing `expo-sqlite` into a key-value adapter would serve neither.
- **Binary values are shown, never edited.** There is no text form of the bytes to round-trip, so only
  their length is reported.

## Debug tab

Tools that break the app on purpose, so the numbers on the other tabs can be trusted. No toolbar:
there is no stream to record and nothing to clear.

### Block and crash a thread

Moved here from the Performance tab, where these sat behind a fifth section chip. Every Performance
section reports something that happened; these go out and cause it.

| Field  | Options                                                                           |
| ------ | --------------------------------------------------------------------------------- |
| Thread | **JavaScript** (works everywhere) or **Main (UI)** (needs a dev build).           |
| For    | `100ms`, `250ms`, `500ms`, `1s`, `3s`, or a custom value in ms.                   |
| Block  | Blocks the chosen thread for that long.                                           |
| Crash  | Crashes the chosen thread. Takes two taps: the first arms it, the second does it. |

Blocking the JS thread shows up as a long task and drops the JS frame rate. Blocking the main thread
freezes the screen while every JS number stays healthy. That gap is the blind spot the frame-rate card
warns about, and this is how you see it for yourself. The crash paths are **not** gated on `__DEV__`,
and they do **not** go through any store: they work as soon as the panel is on screen. What keeps them
out of a release is `enabled: false`, which is what makes the panel unreachable.

Both crash paths are captured by the Crashes tab when crash reporting is on. A JS crash is reported
before you let go of the button; a main-thread crash ends the process and is read back off disk at the
next launch.

---

## React Native DevTools tab

The tab reads the same stores as the panel on the device, so a filter, a sort, a setting or a rule
changed here is changed there too, and the other way round. Setting it up is on [React Native
DevTools](https://axonpack.github.io/docs/expo-devtools/react-native-devtools).

### The bar

| Item              | What it does                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Axonpack** mark | Hover it for what the tab is, with links to the docs, the changelog, the other libraries and GitHub. |
| Tabs              | Press and hold a tab to pick it up, then drag it to a new place.                                     |
| »                 | Appears when the tabs do not fit, and lists the ones that were left out.                             |
| Palette           | The app's themes. A theme picked here is the app's theme too.                                        |
| **Reload**        | Reloads the app, as `r` in Metro does.                                                               |
| Refresh           | Draws the tab again without touching the app. It does not pick up code saved since; **Reload** does. |

A tab with a dotted pattern across its top is one of this package's own. The order you drag them
into lasts until the app reloads.

### Toolbar

| Control         | What it does                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Record          | Pauses and resumes capture. Red while recording.                                                          |
| Clear           | Throws away the log.                                                                                      |
| Sort arrow      | Flips the direction of the current sort. Its tooltip says what pressing it would give you.                |
| Filter          | Shows or hides the filter bar. Filled while any filter is on.                                             |
| Throttling      | `No throttling`, `Slow 3G`, `Fast 3G`, `Fast 4G`, `Offline`, `Custom`. The same profiles as the device's. |
| Export          | Downloads the rows the filters keep as JSON, the same file the device's Export shares.                    |
| Settings (gear) | Shows or hides the settings pane.                                                                         |

### Filter bar

| Control           | What it does                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Filter            | Matches method, URL, status code and source. Match case, match whole word and regular expression sit inside the box, with a clear ✕.                               |
| **Invert**        | Shows everything the search does not match.                                                                                                                        |
| Clear all filters | Resets every filter, and the window picked on the overview.                                                                                                        |
| **More filters**  | Opens the menu below. A count on it says how many of those are on.                                                                                                 |
| Types             | `All`, `Fetch/XHR`, `JS`, `Img`, `Media`, `Other`. Fetch/XHR is every request sent through `fetch` or `XMLHttpRequest`; the others go by the response's MIME type. |

#### More filters

| Item                           | What it does                                                           |
| ------------------------------ | ---------------------------------------------------------------------- |
| Hide data URLs                 | Drops requests whose URL starts with `data:`.                          |
| Hide failed requests           | Drops requests that errored.                                           |
| Only requests in flight        | Keeps the ones that have not finished.                                 |
| Blocked or overridden requests | Keeps the ones a rule of yours answered.                               |
| Status                         | An expression: `404`, `4xx`, `>= 400`, `200-299`, `failed`, `pending`. |
| Larger than, Smaller than      | A size, with a unit or without: `20kb`, `2mb`.                         |
| Slower than, Faster than       | A duration: `500ms`, `2s`.                                             |
| Methods                        | One per method captured. More than one can be on.                      |
| Sources                        | One per source seen. More than one can be on.                          |

A field that cannot be read turns red and filters nothing.

### Settings

| Setting               | What it does                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Big request rows      | Taller rows, each cell with its second line: the status text, what the app was handed, and the time to the first byte. The tab's own setting, apart from the device's. |
| Group by fetch client | Groups the rows under a header per source, with a count.                                                                                                               |
| Overview              | Shows the overview strip above the table.                                                                                                                              |
| Stack header values   | In Headers, puts each value under its name. The tab's own setting, apart from the device's.                                                                            |
| Sort by               | Time, size, duration or status, and the direction.                                                                                                                     |
| User agent            | `Default`, `iPhone Safari`, `Android Chrome`, `Chrome (macOS)`, `Chrome (Windows)`, `Googlebot`, `Custom`.                                                             |
| Custom throttling     | Download (kbps), Upload (kbps) and Latency (ms): what the `Custom` throttle means.                                                                                     |

### Overview

Each request is a bar across time, green while it waits for the first byte and blue while the body
comes in. Drag across it to keep only the requests that started in that window, drag a handle to move
one edge, and double-click to let go. The window is the same one the device's overview picks.

### The table

| Column | What it shows                                                                          |
| ------ | -------------------------------------------------------------------------------------- |
| Name   | The last part of the path and the query, with an icon for the kind of response.        |
| Method | The HTTP method.                                                                       |
| Status | The code, with big rows its text under it, or `(pending)`, `(canceled)` or `(failed)`. |
| Source | The client that sent it: `fetch`, `xhr`, `expo/fetch`, a WebView and so on.            |
| Size   | What crossed the wire, and with big rows, what the app was handed under it.            |
| Time   | How long it took, and with big rows, the time to the first byte under it.              |

Click **Status**, **Size** or **Time** to sort by it, and again to flip the direction. Drag the line
between two headers to resize a column. A failed request is drawn in red. Hovering a cell shows both
of its lines, whatever the row size.

Under the table, the status line counts the requests, what was transferred and when the last one
finished. While a filter is on, each figure reads _shown / all_.

Click a row to open it in the request pane. Right-click a row for its menu.

### Request pane

It opens beside the table, and the table narrows to its Name column. Drag the line between them to
change the split. ✕ closes it.

| Tab         | What it shows                                                                            |
| ----------- | ---------------------------------------------------------------------------------------- |
| Headers     | Network conditions when any were on, then General, Response Headers and Request Headers. |
| Payload     | The request body as fields, or as a JSON tree. Uploaded files by name and size.          |
| Preview     | An image, a page, an SVG, JSON or XML as a tree, or the code, highlighted.               |
| Response    | The body as it came. A binary body as a hex dump.                                        |
| EventStream | A server-sent event stream's events, in place of Preview and Response.                   |
| Timing      | The phases the platform measured, or the wait and the download.                          |
| Cookies     | The cookies the request sent and the ones the response set.                              |
| Initiator   | The code that made the request, with the source around the line.                         |
| Messages    | For a socket, every message in both directions, in place of the others.                  |

The ⋮ at the end of the tab bar opens the request's menu.

### The request menu

Right-click on a row, or ⋮ in the request pane.

| Item                         | What it does                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| **Try in sandbox**           | Opens the request in the sandbox, below.                                                |
| Copy URL                     | To your computer's clipboard.                                                           |
| Copy as cURL, fetch, Node.js | The request as a command, to your computer's clipboard.                                 |
| Copy request payload         | When the request had a body.                                                            |
| Copy response                | When the response has a text body.                                                      |
| **Save response body**       | Downloads the body as a file, named after the request.                                  |
| **Block this URL**           | Makes the app's requests to it fail. Once blocked, it reads **Stop blocking this URL**. |
| **Override response…**       | Opens the override editor, below.                                                       |

A copy shows **Copied**, or why it could not copy, at the foot of the tab.

### Override editor

Opens in the request pane, with ✕ to go back to the request.

| Field        | What it is                                                                     |
| ------------ | ------------------------------------------------------------------------------ |
| Status       | The code to answer with. Anything that is not a status from 100 to 599 is 200. |
| Content type | Sent as the response's `Content-Type`. Empty means `application/json`.         |
| Body         | What the app gets back.                                                        |

It starts from the rule the URL already has, or from what the server really answered. **Save**
applies it to every request to that exact URL, **Remove** drops it, **Cancel** goes back. While a rule
is on the request is not sent at all, so the endpoint does not have to exist.

### Sandbox

Opens in the request pane, with ✕ to go back to the request. The request is on the left and its
response on the right; in a narrow pane they stack.

| Part               | What it holds                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Address bar        | The method, coloured by verb, the URL without its query, a copy button, and **Send**.                                                                                           |
| Authentication     | `none`, `bearer` (a token) or `api key` (a header name and a value). A secret is hidden until the eye shows it.                                                                 |
| Network Conditions | Throttling, custom speeds and the user agent. The whole app's, not this request's.                                                                                              |
| Cookies            | Key and value rows, sent together as one `Cookie` header.                                                                                                                       |
| Headers            | Key and value rows.                                                                                                                                                             |
| Query Parameters   | Key and value rows, added to the URL.                                                                                                                                           |
| Body               | The request body, with **Format JSON** when it is JSON that is not laid out yet. A GET or HEAD is sent without one.                                                             |
| Code Snippet       | The request as cURL, HTTPie, JavaScript fetch, axios, Node.js fetch, Python requests, Swift URLSession, Kotlin OkHttp or Go net/http, with a copy button. Folded to start with. |

A table always ends with a blank row that becomes the next one as you type. A row's checkbox leaves it
out of the request without deleting it.

**Send** sends the request from the device, through the app's own `fetch`. The response then shows:

| Part             | What it holds                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Head             | The time, the size and the status.                                                                          |
| Cookies          | The cookies the response set.                                                                               |
| Request Headers  | The headers the request actually went with, auth and cookies included.                                      |
| Response Headers | Every header that came back.                                                                                |
| Body             | Its content type, **Preview** as a JSON tree or **Raw** with line numbers, a copy button, and **Download**. |

The sent request is also a row in the log, on both surfaces.

## API

### `<DevtoolsProvider>`

Wrap your app in it once, at the root. It starts the devtools as it renders and hosts the panel; there
is no `init` to call.

| Prop                 | Type                                   | Default  | What it does                                                                     |
| -------------------- | -------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `config`             | `DevtoolsConfig`                       | `{}`     | Everything below. Read once, on the first render.                                |
| `showFloatingButton` | `boolean`                              | `true`   | Draw the launcher button. Off leaves the panel reachable via `useDevtoolsPanel`. |
| `iconComponent`      | `ComponentType`                        | none     | Your own glyph in place of the bug icon. Given the resolved `size`.              |
| `size`               | `number`                               | `44`     | Diameter of the button, in dp.                                                   |
| `color`              | `string`                               | accent   | Button fill.                                                                     |
| `iconColor`          | `string`                               | white    | The built-in glyph only.                                                         |
| `statusBar`          | `'app' \| 'auto' \| 'light' \| 'dark'` | `'auto'` | What the status bar content does while the panel is open.                        |

The provider is generic over your theme names, so `config.defaultTheme` only accepts a built-in id or
a key of `config.themes`.

### `DevtoolsConfig`

| Option                               | Type                          | Default     | What it does                                                                          |
| ------------------------------------ | ----------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `enabled`                            | `boolean`                     | `true`      | Whether the devtools run at all. The only gate; see [The panel](#the-panel).          |
| `defaultTheme`                       | `ThemeId`                     | `'light'`   | Which theme the panel opens with: a built-in or one of yours.                         |
| `themes`                             | `Record<string, ThemeConfig>` | `undefined` | Your own themes: a `base` to inherit and the tokens to override.                      |
| `network.http`                       | `boolean`                     | `true`      | Capture plain requests, by whatever transport they left on.                           |
| `network.websocket`                  | `boolean`                     | `true`      | Capture WebSocket connections and their messages.                                     |
| `network.sse`                        | `boolean`                     | `true`      | Capture server-sent event streams and their events.                                   |
| `network.disabledByDefault`          | `boolean`                     | `false`     | Open the Network tab paused.                                                          |
| `console.capture`                    | `boolean`                     | `true`      | Mirror `console.*` into the Console tab, including from declared WebViews.            |
| `console.repl`                       | `boolean`                     | `true`      | Show the `>` prompt. Not gated on `__DEV__`.                                          |
| `console.context`                    | `Record<string, unknown>`     | `undefined` | Extra names an expression can use, e.g. `{ store, queryClient }`.                     |
| `console.disabledByDefault`          | `boolean`                     | `false`     | Open the Console tab paused. The prompt still works.                                  |
| `performance.sampleIntervalMs`       | `number`                      | `1000`      | How often memory is sampled. Each read crosses into the engine, so keep it coarse.    |
| `performance.longTaskThresholdMs`    | `number`                      | `150`       | Only keep tasks that blocked the JS thread at least this long.                        |
| `performance.interactionThresholdMs` | `number`                      | `100`       | Only keep interactions at least this long, event to next paint.                       |
| `performance.historySize`            | `number`                      | `120`       | How many memory samples, long tasks, user timings and interactions are kept.          |
| `performance.disabledByDefault`      | `boolean`                     | `true`      | Open the Performance tab paused. **Defaults to on**, since measuring costs something. |
| `storage.adapters`                   | `StorageAdapterDefinition[]`  | `undefined` | The stores the Storage tab can see. Nothing is discovered automatically.              |
| `storage.maxKeys`                    | `number`                      | `1000`      | Keys read per store before the tab stops and says how many it skipped.                |
| `storage.readOnly`                   | `boolean`                     | `false`     | Blanket read-only default; an individual adapter can still set its own.               |

`crash` is documented on its own, under
[Crash reporting](https://axonpack.github.io/docs/expo-devtools/crash-reporting).

### Storage adapters

Four factories, all built on the last one. Each returns a `StorageAdapterDefinition` for
`storage.adapters`; ids are assigned from the names as the provider starts, suffixed on collision.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

const mmkv = createMMKV();

const config = {
  storage: {
    adapters: [
      asyncStorageAdapter({ driver: AsyncStorage }),
      mmkvAdapter({ driver: mmkv }),
      secureStoreAdapter({ driver: SecureStore, keys: ['session', 'pin'] }),
      defineStorageAdapter({
        name: 'In-memory',
        kind: 'sync',
        getAllKeys: () => [...map.keys()],
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, text) => {
          map.set(key, text);
        },
        removeItem: (key) => {
          map.delete(key);
        },
      }),
    ],
  },
} satisfies DevtoolsConfig;
```

| Factory                                | For                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asyncStorageAdapter({ driver })`      | `@react-native-async-storage/async-storage` and anything copying its API. Uses `getMany` (v3) or `multiGet` (v1/v2) for batch reads when present. |
| `mmkvAdapter({ driver })`              | `react-native-mmkv`, both majors — v4's `remove` and v3's `delete` are both accepted.                                                             |
| `secureStoreAdapter({ driver, keys })` | `expo-secure-store`. Takes `keys` because the keychain cannot be listed, and an optional `options` passed through to every call.                  |
| `defineStorageAdapter({ ... })`        | Anything else. Duck-types nothing; takes exactly what you hand it.                                                                                |

All four accept `name` (defaulted from the library), `readOnly`, `supportedTypes` and `blacklist`. `defineStorageAdapter` needs either
`getAllKeys` or a fixed `keys` list — passing `keys` is what turns enumeration off, and it may be a
function, resolved on every read, for an app that keeps its own list of what it stored — and any of
`getItem` (required), `getMany`, `setItem`, `removeItem`. **Whether the tab can edit or delete is
derived from which of those you provided**, so a store you registered read-only in effect is read-only
in the UI without a flag. Sync functions are fine everywhere: they're awaited, not branched on, and
`kind` only decides the badge the tab shows.

`getItem` may return a bare `string | null`, or a `{ text, valueType }` when the type matters — that
second form is how `mmkvAdapter` keeps a stored `1` from rendering as `"1"`, and what an edit is written
back through.

`blacklist` is a `RegExp` or a `(key: string) => boolean`, and a key it matches is never listed, never
read, and never written — the filtering happens in the adapter, before the read, not in the view, so
the value never reaches memory at all. A `/g` regex is safe: `lastIndex` is reset before every test.
The summary says a blacklist is set, but never how many keys it matched — that is a count this tab
deliberately never learns.

`supportedTypes` is the list of types the store can actually hold, and it defaults to all four.
`asyncStorageAdapter` and `secureStoreAdapter` declare `['string']` for you, since both hand back a
string whatever went in; MMKV takes all four. The Add-key sheet offers only these types, so a write
the store would have flattened is never offered in the first place. Binary is never offered for
either creating or editing — there is no text form of the bytes to round-trip.

### `devtools`

A module-level object, imported from the package root. For the things the panel cannot do for you.

```ts
import { devtools } from '@axonpack/expo-devtools';
```

| Member                                                                                       | What it does                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mark(name, options?)`                                                                       | Records a user-timing mark. `options`: `{ detail?, startTime? }`.                                                                                                                      |
| `measure(name, startOrOptions?, endMark?)`                                                   | Records a measure. Second argument is a start-mark name or `{ start?, end?, duration?, detail? }`. Passing `start`, `end` **and** `duration` together throws, since they can disagree. |
| `clearMarks(name?)`                                                                          | Drops recorded marks, all of them or one name.                                                                                                                                         |
| `clearMeasures(name?)`                                                                       | Drops recorded measures, all of them or one name.                                                                                                                                      |
| `setCrashContext(context)`                                                                   | Keys attached to every crash record from here on. Replaces rather than merges; `null` clears.                                                                                          |
| `networkLogStore`, `networkConditionsStore`, `consoleLogStore`, `storageStore`, `crashStore` | The underlying stores, if you want to read or drive them yourself.                                                                                                                     |

Nothing on it does anything until a provider has started with `enabled: true`, so call sites need no
guard of their own.

#### User timing

```ts
devtools.mark('checkout');
await buildCart();
devtools.measure('checkout'); // measures from the mark of the same name
```

`measure` follows the [W3C User Timing](https://www.w3.org/TR/user-timing/) signatures, and calls are
forwarded to the real `performance.mark`/`measure` too, so the entries exist on the platform timeline
as well. Nothing is _observed_ from that timeline, which is why React's own internal measures never
appear in the list.

### `useDevtoolsPanel()`

Opens and closes the panel from your own UI, which is what makes `showFloatingButton={false}` usable.

| Member     | What it is                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `visible`  | Whether the panel is open right now.                                                                      |
| `enabled`  | Whether the devtools are running. `false` in a build with `enabled: false`, and then `show` does nothing. |
| `show()`   | Opens the panel.                                                                                          |
| `hide()`   | Closes it.                                                                                                |
| `toggle()` | Either way.                                                                                               |

It reads the same state the launcher button does, so the two stay in step. Branch your own trigger on
`enabled` and a release build has no dead button in it.

### `useDevtoolsWebView(source?)`

Returns the props one `<WebView>` needs to report in. `source` is the label its rows carry, defaulting
to `'webview'`; name each one when the app has more than one. Any string works, and it is only a label.

```tsx
const devtoolsWebView = useDevtoolsWebView('checkout');

<WebView {...devtoolsWebView} source={{ uri }} />;
```

| Prop returned                           | What it does                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `injectedJavaScriptBeforeContentLoaded` | Patches `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `console` in the page. |
| `onMessage`                             | Receives what the page reports. Returns `true` when the message was one of ours.         |
| `ref`                                   | Lets a conditions change reach an already-loaded page.                                   |
| `userAgent`                             | The current user-agent override, so the page identifies itself the way the panel says.   |
| `onShouldStartLoadWithRequest`          | Blocks navigation while Offline is on.                                                   |

Everything it returns is inert until the devtools are running: the injected script is empty, and with
no `onMessage` behind it `react-native-webview` does not install the page bridge at all. Replace a prop
with your own and you lose what it did, so compose rather than overwrite. That is what `onMessage`
returning `true` is for.

### The launcher button

The button is draggable, stays inside the screen, and keeps a 44dp touch area through `hitSlop` even at
a smaller `size`. Rendering it is also what marks _first render_ for the startup breakdown. Its props
are the loose ones on [`<DevtoolsProvider>`](#devtoolsprovider); `showFloatingButton={false}` takes it
away without taking the panel with it.

`statusBar` decides what the status bar _content_ does while the panel is open, since the panel's header
extends behind it: `'auto'` follows the active theme's own `statusBarStyle`, `'app'` leaves whatever the
app set, and `'light'` / `'dark'` force it. Whatever the app had is restored on close. On iOS this needs
`UIViewControllerBasedStatusBarAppearance` set to `false` in `Info.plist`, which is what an Expo app's
own template does.

### Themes

A theme patches a base rather than redefining everything:

```tsx
<DevtoolsProvider
  config={{
    defaultTheme: 'midnight',
    themes: { midnight: { base: 'dark', colors: { accent: '#a78bfa' } } },
  }}>
```

Built-in ids: `light`, `dark`, `dracula`, `nord`, `monokai`, `one-dark`, `solarized-light`. Reuse one
as your own name and you replace it. A `defaultTheme` naming something unregistered is ignored rather
than leaving the panel unstyled. The choice lives in memory for the session. Persisting it would
mean taking a storage dependency for a colour scheme.

The 25 tokens of `Palette`:

| Group    | Tokens                                                                                      |
| -------- | ------------------------------------------------------------------------------------------- |
| Surfaces | `background`, `toolbarBackground`, `toolbarOverlay`, `surface`, `sectionTint`, `border`     |
| Chrome   | `toolbarText`, `toolbarTextActive`                                                          |
| Text     | `textPrimary`, `textSecondary`                                                              |
| Status   | `accent`, `pending`, `success`, `error`, `warning`, `errorSurface`, `warningSurface`        |
| Search   | `matchHighlight`                                                                            |
| Syntax   | `keyAccent`, `jsonKey`, `jsonString`, `jsonNumber`, `codeKeyword`, `codeComment`, `codeTag` |

`matchHighlight` is the background painted behind text matching the current search. Every built-in
palette sets it to a translucent colour so syntax highlighting still reads through it — keep that
property if you override it.

### Exported types

`DevtoolsConfig`, `DevtoolsNetworkConfig`, `DevtoolsConsoleConfig`, `DevtoolsPerformanceConfig`,
`DevtoolsStorageConfig`, `DevtoolsCrashConfig`, `DevtoolsProviderProps`, `DevtoolsPanelControls`,
`DevtoolsWebViewProps`, `BuiltInThemeId`, `ThemeId`, `ThemeConfig`, `Palette`,
`NetworkLogEntry`, `NetworkLogStatus`, `ResolvedNetworkConditions`, `ThrottlePresetId`,
`ThrottleProfile`, `UserAgentPresetId`, `ConsoleLogEntry`, `ConsoleLogLevel`, `LongTaskEntry`,
`MemorySample`, `StartupTiming`, `UserTimingEntry`, `MarkOptions`, `MeasureOptions`,
`StorageAdapter`, `StorageAdapterConfig`, `StorageAdapterDefinition`, `StorageAdapterKind`,
`StorageKeyBlacklist`,
`StorageAdapterState`, `StorageEntry`, `StorageReadResult`, `StorageValueType`, `StoredValueKind`,
`AsyncStorageLikeDriver`, `MmkvLikeDriver`, `SecureStoreLikeDriver`, `CrashRecord`, `CrashKind`,
`CrashBreadcrumb`, `CrashBreadcrumbCategory`, `CrashDeviceInfo`, `CrashNativeDetail`,
`CrashPopupDetail`, `DevtoolsErrorBoundaryProps`, `StatusBarStyle`.

---

## What needs a development build

Everything else works in Expo Go. The native module is loaded optionally, so a missing module dims a
control instead of breaking the panel.

| Feature                     | Without a dev build                                        |
| --------------------------- | ---------------------------------------------------------- |
| Main-thread frame rate      | Reads `dev build`; the JS line still plots.                |
| App memory · Device memory  | Card says `Needs a dev build`.                             |
| Storage card (disk space)   | Card says `Needs a dev build`; Android only regardless.    |
| Startup, measured block     | Falls back to the platform block, which may be all dashes. |
| Debug tab, Main (UI) thread | Block and crash buttons disabled with a note.              |

Platform-dependent regardless of build type: long tasks and interactions only appear if the native
side implements those entry types, which varies by platform and React Native version. When they're
missing the list says so rather than showing zeros.

The Storage tab needs nothing from this package's native module — but the stores you register bring
their own requirements. MMKV and SecureStore carry native code of their own, so a store that needs a
dev build to exist at all also needs one to be inspectable. A store built on `defineStorageAdapter`
alone (an in-memory `Map`, say) works in Expo Go.
