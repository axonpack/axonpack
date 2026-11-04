# Reference

Every control, section and field in the panel, and the whole public API. The
[guides](https://axonpack.dev/docs/expo-devtools) are the tour; this is the map.

This file ships inside the package. The same reference, split into pages and searchable, is at
[axonpack.dev/docs/expo-devtools/reference](https://axonpack.dev/docs/expo-devtools/reference).

- [The panel](#the-panel)
- [Network tab](#network-tab)
- [Console tab](#console-tab)
- [Performance tab](#performance-tab)
- [Storage tab](#storage-tab)
- [Preview tab](#preview-tab)
- [CLI tab](#cli-tab)
- [React Native DevTools tab](#react-native-devtools-tab)
- [The `devtools` command line tool](#the-devtools-command-line-tool)
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

| Item         | What it does                                                                                                                                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab bar      | **Network**, **Console**, **Performance**, **Storage**, **Query**, **Navigation**, **Redux**, **Preview**, **Crashes**, **CLI**, **Debug**. Query, Navigation, Redux and Preview show only when the app has one to show. Scrolls horizontally on a narrow screen. |
| Error badge  | A red count on the Console tab when it isn't the active tab, showing captured `console.error`s. The Crashes tab carries the same badge for unread reports.                                                                                                        |
| Palette (🎨) | Opens the theme list; the active one is ticked. Applies immediately.                                                                                                                                                                                              |
| Close (✕)    | Dismisses the panel. Recording carries on while it's closed.                                                                                                                                                                                                      |

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

On the tabs that record (Network, Console, Performance, Navigation and CLI) it opens with the
same two controls:

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
| Overrides       | Opens the overrides panel below. Lit while any override or block is on.                                      |
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

### Overrides panel

Every override and block you have set, newest first, also after its request has left the log. Each
row says `Override <status>` or `Blocked` over the URL; tap the URL to see all of it and select it.

| Action        | What it does                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------- |
| **Edit**      | On an override. Opens the override editor on the rule.                                        |
| **Block**     | On an override. Turns it into a block. The response stays on the rule for **Override** later. |
| **Override**  | On a block. Opens the override editor; **Save** turns the block into an override.             |
| **Remove**    | Drops the rule.                                                                               |
| **Clear all** | Asks first, then drops every rule.                                                            |

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

The sheet's ⋮ menu is the same list; **Override response…** closes the sheet and opens the override editor.

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
- Anything passed in `console.context` is in scope by name, and so is what a
  [support](#supports) adds, such as `preview`. `console.context` wins a clash.
- The `devtools` command line tool lists the same names in its [`context` topic](#context), reads
  one with `devtools get context <name>`, and calls a function with
  `devtools context call <name> --yes`. With `console.repl` off, that topic is off too.

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

**Memory and CPU**

| Field                     | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JS Heap plot              | `performance.memory` used heap, captioned `of <total> allocated`. Reads `This JS engine doesn't report it` on JSC/V8.                                                                                                                                                                                                                                                                                                                                                   |
| App memory plot           | Whole-process footprint, what the OS holds against you. Needs a dev build.                                                                                                                                                                                                                                                                                                                                                                                              |
| Device memory meter       | Used against total RAM, captioned with what is still available to this app. On Android that's system-wide free memory; on iOS it's what the process can still claim. Needs a dev build.                                                                                                                                                                                                                                                                                 |
| CPU usage (this app) plot | Three lines on a fixed 0 to 100% axis. Total is a share of every core the phone has, so 100% means all of them busy; the core count shows beside the title. JavaScript (the JS thread) and UI thread (the main thread) are each a share of one core, since a thread runs on one core at a time, so 100% means that thread never stopped. A thread that could not be read shows `not measured` and is not drawn. Says `CPU usage needs a development build` without one. |

The plots are sampled on `performance.sampleIntervalMs` (default 1 s) and span `historySize`
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
mean "wipe your storage". The tab lists the keys on open and on Refresh; nothing polls. A value is
read only when its row is on screen, when you open the key, or when you export, and an unread row
shows `…` for its type and size. A search on key names covers every key; value search, the type
filter, the totals and the size and type sorts cover the values read so far.

### Import

There is no filesystem module in this package and no dev server to upload to, so a snapshot comes
back the way it left: as text. The sheet takes a paste (or reads the clipboard for you), then says
what the file would do before anything is written — how many keys are new, how many would be
overwritten, how many already hold exactly that value, and how many are skipped, with the reason:
hidden by the blacklist, a type this store does not hold, no value to write, or redacted. A redacted
value is never written back, and neither is a key redacted in this store. A file exported from a
different store is not refused, but it is called out.

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
- `13 of 4312 values read. A value is read when its row is on screen, and sizes, types and value search cover only those.`
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

## Preview tab

`@axonpack/preview`'s own list, in the panel's theme, there once the
[preview support](#supports) is in `supports`. When `@axonpack/preview` isn't installed, the
tab shows that error instead. The guide is [Preview](https://axonpack.dev/docs/expo-devtools/supports/preview),
and each part of the list is on preview's
[App setup](https://axonpack.dev/docs/preview/app-setup#the-ready-made-list).

| Part                | What it holds                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Error snackbar      | Only when something went wrong: what, and what to try, with Retry and Dismiss.                                              |
| Header card         | What runs now, **Back to default**, Refresh, and **Show details** for the build's facts.                                    |
| Dev preview servers | This app's Metro servers, in a debug build with preview's `enabled` and `devPreviewServers` on. Tap a row to restart on it. |
| Published previews  | Each preview for this build, with Download, Switch, Update and Delete.                                                      |
| Incompatible        | Downloads made for another native build, with **Delete all**.                                                               |

The Axonpack tab in React Native DevTools has the same list as its Preview panel, after Navigation.
There every row is drawn at once, there is no pull to refresh, and the list is read again each time
the panel opens.

## CLI tab

Every query and [action](#actions) an AI agent, or you, made in the app with
[the `devtools` command line tool](#the-devtools-command-line-tool), newest first, with the reply it
got. Holds the **100** most recent. The reply is recorded after every redaction, so the tab shows
exactly what left the app. The same list is a panel in the React Native DevTools tab, and the
`cli` topic of the tool. Up to version 3.8 the tab was called **AI Usage**. The old `ai-usage` topic
and the old `aiUsage` config key still work, but are deprecated.

Record (⏺) and Clear (⊘) open the toolbar, as on the other tabs that record. Paused, agents can still
query and act, and nothing they do is kept. `cli.disabledByDefault` opens the tab paused.

| Row element | Meaning                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Command     | The query or action as you would type it after `devtools`, flags included, quoted only where a shell needs it.                     |
| Time        | Wall-clock time the app answered.                                                                                                  |
| Matched     | Rows the query matched, of the rows the topic held, as `2/214`. `-` for an error or a topic that is off. `action` marks an action. |
| Error       | In place of Matched, in red, when the reply was an `error:` line.                                                                  |
| Took        | How long the app took to answer.                                                                                                   |

Tap a row for its detail sheet: the command and **Copy** (the reply) in the header, then Time, Topic,
Matched (Action and its name, for an action), Took, Reply size and any Error, then the **Reply** section, a JSON tree for `get` or
`--json` output and monospace text otherwise.

- `apps` and `topics` are probes and are not listed.
- Up to 64 K characters of each reply are kept. Reply size then says `cut to the first 64 K`.
- A query of `cli` itself is listed without its reply, which would otherwise repeat every earlier
  reply.
- Every action is listed, refused ones too. One that waits on the app (`network send`, `replay`) is
  listed when it ends. In its command a masked header shows as `[redacted]`, and a body over 200
  characters as its start and length.
- With no query yet, the tab says **No queries yet**, says an agent can read the devtools, mock
  a request or send one, and shows `npx devtools topics` to start with.

---

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
DevTools](https://axonpack.dev/docs/expo-devtools/react-native-devtools).

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
| Overrides       | Shows or hides the overrides pane. Lit while any override or block is on.                                 |
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

| Field        | What it is                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Status       | The code to answer with. Anything that is not a status from 100 to 599 is 200. The app gets the status as set, 1xx included. |
| Content type | Sent as the response's `Content-Type`. Empty means `application/json`.                                                       |
| Body         | What the app gets back.                                                                                                      |

It starts from the rule the URL already has, or from what the server really answered. **Save**
applies it to every request to that exact URL, **Remove** drops it, **Cancel** goes back. While a rule
is on the request is not sent at all, so the endpoint does not have to exist.

### Overrides pane

The app's overrides panel, under the toolbar: every override and block, with **Edit** (or
**Override** on a block), **Block**, **Remove** and **Clear all**, which asks first. **Edit** opens the
override editor in place of the list, and **Save** or **Cancel** goes back to it. Hover a URL for the
whole of it. A rule changed here changes in the app too, and the other way round.

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

---

## The `devtools` command line tool

The `devtools` command line tool reads what the devtools recorded in a running app, can mock, block
or send a request in it, and can call a function the app exposed to the Console tab's `>` prompt.
This section lists everything it takes and prints, as does
[the CLI reference](https://axonpack.dev/docs/expo-devtools/reference/cli) on the docs site.
[Use with AI agents](https://axonpack.dev/docs/expo-devtools/ai-agents) shows how to use it, with a
snippet for your agent.

### Running it

| Package manager | Command                        | Where                    |
| --------------- | ------------------------------ | ------------------------ |
| npm             | `npx devtools <command>`       | The app's project folder |
| yarn            | `yarn devtools <command>`      | The app's project folder |
| pnpm            | `pnpm exec devtools <command>` | The app's project folder |
| bun             | `bunx devtools <command>`      | The app's project folder |

`bun devtools` runs a `devtools.ts` file first if the folder has one. In a monorepo, or outside the
app's folder, `npx devtools` can miss the local install and fetch an unrelated npm package named
`devtools`. `npx @axonpack/expo-devtools <command>` always runs this one. Below, `devtools` stands
for whichever form you use.

| Needs                | Why                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Node 22 or newer     | Its built-in `WebSocket` sends the Origin header Metro asks for. Older Node exits with code 1. |
| A development bundle | The app in a dev build or Expo Go, with `<DevtoolsProvider>` mounted and `enabled` on.         |
| `expo start` running | On this computer. The tool talks to Metro on `127.0.0.1`, ports 8081 to 8090 unless `--port`.  |

### Commands

| Command                                    | What it prints                                                                                                                                                                                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `devtools apps`                            | One row per app and device on Metro: `app`, `name`, `device`, `devtools`, `metro`, `note`.                                                                                                                                                            |
| `devtools topics`                          | One row per topic in the picked app: `topic`, `rows` (`off` when the app turned it off), `actions` (comma-separated, `-` for none), `about`.                                                                                                          |
| `devtools <topic> [flags]`                 | The topic's rows, newest first, with the [query flags](#query-flags).                                                                                                                                                                                 |
| `devtools get <topic> <id>`                | One row as indented JSON.                                                                                                                                                                                                                             |
| `devtools <topic> <action> [args] [flags]` | Changes something in the app. See [Actions](#actions).                                                                                                                                                                                                |
| `devtools <command> --help`                | The help for that command. `devtools`, `devtools help` and `devtools --help` print the main help. `devtools network --help` adds the network actions, and `devtools network <action> --help` prints only them. The same for `context` and its `call`. |

`apps` and `topics` are probes: the [CLI tab](https://axonpack.dev/docs/expo-devtools/reference/cli-tab)
doesn't list them. In `apps`, the `devtools` column is the package version in the app, `-` when the
app doesn't have it, and `?` when it can't be checked without `--force`.

### Flags

A flag is `--name value` or `--name=value`. A value can start with a dash, as in `--sort -ms`. `-h`
is the only short flag.

#### Query flags

The same on every topic. `get` takes `--full`, `--json` and `--out`.

| Flag         | Value                                  | Default             | What it does                                                                                                                     | Example                             |
| ------------ | -------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `--grep`     | text, or `/regex/flags`                | none                | Rows holding it in any value, bodies included. Text ignores case. Keys are not searched.                                         | `--grep timeout`                    |
| `--where`    | a [clause](#where-clauses), repeatable | none                | Rows where the clause holds. Every `--where` must hold.                                                                          | `--where 'code>=400'`               |
| `--since`    | a [time](#times)                       | none                | Rows at or after it.                                                                                                             | `--since 10m`                       |
| `--until`    | a [time](#times)                       | none                | Rows at or before it.                                                                                                            | `--until 2026-11-03T10:00:00Z`      |
| `--limit`    | whole number from 1                    | `50`                | Rows to print, or groups with `--group-by`.                                                                                      | `--limit 20`                        |
| `--after`    | a row id                               | none                | Only rows newer than it, oldest first.                                                                                           | `--after fetch-1762172310455-212`   |
| `--before`   | a row id                               | none                | Only rows older than it.                                                                                                         | `--before console-1762172290871-80` |
| `--sort`     | field, or `-field`                     | newest first        | Sorts by that field, `-` for descending. Rows without a value go last. No cursors.                                               | `--sort -ms`                        |
| `--fields`   | comma list of fields                   | the topic's columns | The columns to print.                                                                                                            | `--fields id,code,url`              |
| `--count`    | none                                   | off                 | Prints only how many rows match.                                                                                                 | `--count`                           |
| `--group-by` | field                                  | none                | Prints how many rows have each value, most first.                                                                                | `--group-by code`                   |
| `--full`     | none                                   | off                 | Strings whole. Without it, a string over 2,048 characters is cut.                                                                | `--full`                            |
| `--json`     | none                                   | off                 | JSON lines, one object per row, with no `#` lines. `get` prints one line.                                                        | `--json`                            |
| `--out`      | file path                              | none                | Writes the reply whole (as with `--full`) to the file, and prints one line saying so. With `get`, the file holds the JSON alone. | `--out response.json`               |

#### App flags

Needed only when more than one app is running, or for an app on another port.

| Flag           | Value        | Default      | What it does                                                                                                                          | Example          |
| -------------- | ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `--app`        | Expo slug    | none         | The app with this slug, whole, any case. Without an Expo manifest, the app id.                                                        | `--app my-app`   |
| `--device`     | text         | none         | The app on a device whose name holds this text, any case.                                                                             | `--device pixel` |
| `--port`       | whole number | 8081 to 8090 | Look on this Metro port only.                                                                                                         | `--port 8082`    |
| `--force`      | none         | off          | Attach to an app that can't share its debugger and has no `withDevtools` to ask through. It closes a DevTools window open on the app. | `--force`        |
| `--help`, `-h` | none         | off          | Print the help for the command instead of running it.                                                                                 | `network --help` |

`apps` takes `--port`, `--force` and `--json`. `topics` takes the app flags and `--json`.
An action takes the app flags and its [action flags](#action-flags).

#### Where clauses

`<field><op><value>`, or `<field>?`.

| Op                | Holds when the value                                                | Example          |
| ----------------- | ------------------------------------------------------------------- | ---------------- |
| `=`               | equals it, ignoring case                                            | `method=get`     |
| `!=`              | does not equal it. A row with no value holds too                    | `level!=log`     |
| `>` `>=` `<` `<=` | compares as a number. The value must be a number                    | `ms>1000`        |
| `~`               | contains it, ignoring case, or matches a `/regex/flags`             | `url~/v1/`       |
| `!~`              | does not contain it or match it. A row with no value holds too      | `url!~analytics` |
| `?`               | has a value: not empty, not missing (`<field>?`, no value after it) | `error?`         |

A plain value with commas is any of them: `method=get,post`. A `/regex/` is never split on commas.
An object value is matched as its JSON.

#### Times

`--since` and `--until` take a number and a unit, `ms`, `s`, `m`, `h` or `d` (`30s`, `1.5h`), counted
back from now on the device's clock, or any date the JavaScript `Date` reads, such as an ISO time. A
row with no time, such as every `storage` row, is left out by either.

### Topics

`id` and `t` are on every topic: `id` is what `get`, `--after` and `--before` take, and `t` is the
time `--since` reads, printed as an ISO time. Fields in **bold** are the columns shown by default.
A `--fields` name that doesn't exist answers with the topic's fields.

#### network

HTTP requests, WebSockets and server-sent event streams since launch, the last 1,000. `get` adds a
socket's frames as `messages` and a stream's events as `events`. A request's initiator lists each
frame as a file with its line and column, and keeps frames from libraries only with `--full`.

`--where state=error` lists every request that failed: a 4xx or 5xx answer, a request that got no
answer, and a socket that failed. `--where 'code>=400'` lists only the 4xx and 5xx answers. A socket
has no `code`; how it closed is in `close`.

| Field        | Value                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **`id`**     | The row's id                                                                                                                         |
| `t`          | When it started                                                                                                                      |
| `kind`       | `http`, `ws` or `sse`                                                                                                                |
| **`method`** | The HTTP method                                                                                                                      |
| **`code`**   | The HTTP status. Empty for a socket                                                                                                  |
| `close`      | A socket's close code, `1000` for a normal close. Empty for HTTP                                                                     |
| **`state`**  | `pending`, `success` or `error` (a 4xx or 5xx answer, or no answer); a socket's `connecting`, `open`, `closing`, `closed` or `error` |
| **`ms`**     | How long it took                                                                                                                     |
| **`url`**    | The URL                                                                                                                              |
| `error`      | Why it failed                                                                                                                        |
| `type`       | The response's MIME type (HTTP)                                                                                                      |
| `size`       | The response body's size in bytes (HTTP)                                                                                             |
| `msgs`       | How many frames or events a socket or stream has                                                                                     |
| `source`     | The name of the WebView that made it. Empty for the app's own                                                                        |
| `request`    | The request body (HTTP)                                                                                                              |
| `response`   | The response body (HTTP)                                                                                                             |

#### console

Console lines since launch, the last 500. A line repeated in a row is one row with a count.

| Field       | Value                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------- |
| **`id`**    | The row's id                                                                              |
| `t`         | When it was logged                                                                        |
| **`level`** | `log`, `info`, `warn`, `error`, `debug`, `input` and `result` (the `>` prompt) or `crash` |
| **`text`**  | The whole line as text                                                                    |
| `count`     | How many times it repeated                                                                |
| `source`    | `native` for the app, or the name of the WebView that logged it                           |
| `crash`     | The crash report's id, when the line is a crash                                           |

#### context

The names the Console tab's [`>` prompt](#the--prompt) has:
the app's `console.context`, then what each [support](#topics-from-supports) adds. It reads the same
list the prompt does, so the two always agree. A name in `console.context` wins over a support's of
the same name, and the row's `source` says `app`. The prompt's own `$m` and `$modules` are not
listed, and no global is. The rows keep the order the names were added in, and have no time.
`off` when `console.repl` is `false`.

| Field         | Value                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `id`          | The name, the same as `name`                                                                     |
| **`name`**    | The name, as the prompt reaches it                                                               |
| **`type`**    | `function`, `object` (arrays included) or `value`                                                |
| **`source`**  | `app` for `console.context`, or the support's id, such as `preview`                              |
| **`preview`** | The value as one line, as the prompt prints it, cut at 80 characters. A function is `ƒ <name>()` |

`get context <name>` prints the value whole, as the prompt holds it in a row: a function as
`ƒ <name>()`, an `Error` as its stack, a `Date` as an ISO time, a `Map` as an object, a `Set` as an
array, a cycle as `[Circular]`, and anything deeper than six levels as `[Object]` or `[Array]`.
Strings over 2,048 characters are cut unless `--full`. The name can be a dot path into a value,
such as `preview.status` or `store.getState`. A path through `constructor`, `prototype` or
`__proto__` is refused.

To run a function, use the [`call` action](#context-actions).

#### performance

Long tasks, slow interactions, marks and measures, newest first. Kept only while the Performance tab
records, and it starts paused. Memory and frame-rate samples are not rows. An empty list while the
tab is paused ends in `# paused: the Performance tab records only after record is pressed`.

| Field      | Value                                          |
| ---------- | ---------------------------------------------- |
| **`id`**   | The row's id                                   |
| `t`        | When it happened                               |
| **`kind`** | `longtask`, `interaction`, `mark` or `measure` |
| **`name`** | Its name                                       |
| **`ms`**   | How long it took                               |
| `handler`  | How long an interaction's handlers ran         |
| `detail`   | The `detail` a mark or measure was given       |

#### storage

Every key of every registered store, by store then key. Rows have no time. Each query lists every
store's keys again, so keys the app wrote since show up, and keeps the values already read. A list
then reads the values on its page, and `--grep` or a `--where`, `--sort` or `--group-by` on `value`,
`type`, `size` or `error` reads every key once. A value read earlier is not read again.

| Field       | Value                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **`id`**    | `<store>/<key>`                                                                                                               |
| `t`         | Always empty                                                                                                                  |
| `store`     | The store's id                                                                                                                |
| `key`       | The key                                                                                                                       |
| **`type`**  | `json-object`, `json-array`, `string`, `number`, `boolean`, `buffer`, `empty`, `absent`, or `unread` before its value is read |
| `size`      | The value's size in UTF-8 bytes                                                                                               |
| **`value`** | The value as text, after redaction                                                                                            |
| `error`     | Why reading it failed                                                                                                         |

#### query

The TanStack Query cache: queries and mutations, the one updated last first. `off` with no
`QueryClient` in `config.query.client`.

| Field           | Value                                                    |
| --------------- | -------------------------------------------------------- |
| **`id`**        | The query hash, or `mutation-<n>`                        |
| `t`             | When it last updated, or when the mutation was submitted |
| **`type`**      | `query` or `mutation`                                    |
| `key`           | A mutation's key                                         |
| **`status`**    | Its status                                               |
| **`observers`** | How many observers a query has                           |
| `variables`     | A mutation's variables                                   |
| `data`          | Its data                                                 |
| **`error`**     | Its error                                                |

#### navigation

The moves the navigator made, the last 200. `off` with no Expo Router or React Navigation found.

| Field        | Value                                |
| ------------ | ------------------------------------ |
| **`id`**     | The row's id                         |
| `t`          | When it moved                        |
| **`action`** | The action's type                    |
| **`from`**   | The route it left                    |
| **`to`**     | The route it landed on               |
| `path`       | The destination's URL path           |
| `params`     | The destination's params             |
| `container`  | The navigation container that moved  |
| `noop`       | True when the action changed nothing |

#### redux

Dispatched actions, the last 200, each with what it changed. Never the whole state. `off` with no
store using `devtoolsReduxEnhancer()`.

| Field         | Value                                       |
| ------------- | ------------------------------------------- |
| **`id`**      | The row's id                                |
| `t`           | When it was dispatched                      |
| **`type`**    | The action's type                           |
| `action`      | The whole action                            |
| **`changed`** | The state paths it changed, comma-separated |
| `changes`     | How many paths it changed                   |

`get` adds each change: its path, whether it was added, removed or changed, and the value before and after.

#### crash

Captured crashes, newest first. `get` adds the stack, the breadcrumbs and the device. `off` when
`crash.enabled` is false.

| Field         | Value                                                                               |
| ------------- | ----------------------------------------------------------------------------------- |
| **`id`**      | The row's id                                                                        |
| `t`           | When it happened                                                                    |
| **`kind`**    | `js-fatal`, `js-error`, `unhandled-rejection`, `react-render` or `native-exception` |
| **`name`**    | The error's name                                                                    |
| **`message`** | The error's message                                                                 |
| `route`       | The screen on top when it happened                                                  |
| `previous`    | True for a crash read back from the previous launch                                 |
| `seen`        | True once the report was shown                                                      |

#### cli

The queries and actions made with this tool, the last 100, each with the reply it got. Its `#` lines
call it CLI, as the tab does: `# CLI · <app> · <device> · 2 of 2 match`. A query of `cli` keeps no
reply. `--where 'action?'` lists the actions alone.

`ai-usage` is the topic's old name, from when the tab was called AI Usage. It still works and
answers the same rows, but it is deprecated and `topics` doesn't list it.

| Field         | Value                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`id`**      | `q<n>`                                                                                                                                               |
| `t`           | When the app answered                                                                                                                                |
| **`command`** | The query or action as you would type it after `devtools`. A masked header shows as `[redacted]`, a body over 200 characters as its start and length |
| `topic`       | The topic it asked about                                                                                                                             |
| `action`      | The action's name. Empty for a query                                                                                                                 |
| **`matched`** | Rows it matched                                                                                                                                      |
| **`total`**   | Rows the topic held                                                                                                                                  |
| **`ms`**      | How long the app took                                                                                                                                |
| `size`        | The whole reply's length in characters                                                                                                               |
| `error`       | The message of an `error:` reply                                                                                                                     |
| `cut`         | True when only the first 64 K characters of the reply were kept                                                                                      |
| `reply`       | The reply as the agent got it                                                                                                                        |

#### Topics from supports

A [support](#supports) in the devtools config's `supports` adds a topic of its own. `devtools topics`
lists it only while the support is configured, and it takes the same flags as every other topic.
When the support's package isn't installed, or is on another major, the topic is `off`, and its
reason is the error the start logs.

##### preview

From the [preview support](https://axonpack.dev/docs/expo-devtools/supports/preview#from-the-command-line):
what runs now, then the dev servers, then the previews for this build. Each query first asks the
bucket again and looks for dev servers, behind a `# wait:` line. `get` prints preview's own object
for the row. `off` when the preview config has `enabled: false`.

| Field         | Value                                                                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`id`**      | `now` for what runs now, a dev server's `host:port`, or a preview's id                                                                                                                                                                     |
| `t`           | A preview's publish time. Empty for the other rows                                                                                                                                                                                         |
| **`kind`**    | `now`, `server` or `preview`                                                                                                                                                                                                               |
| **`title`**   | What runs now, a `preview start` server's title, or a preview's title. Empty for a plain `expo start` server                                                                                                                               |
| **`status`**  | `now`: `built-in`, `expo-dev-server`, `dev-preview-server`, `preview` or `server`. A server: `compatible`, `incompatible` or `unknown`. A preview: `available`, `downloading`, `downloaded`, `update-available`, `unpublished` or `broken` |
| **`branch`**  | The branch it was built from                                                                                                                                                                                                               |
| **`active`**  | True for the row that runs now, and always for `now`                                                                                                                                                                                       |
| `environment` | A preview's EAS environment                                                                                                                                                                                                                |

### Actions

`devtools <topic> <action> [args] [flags]` changes something in the app. `network` and `context`
have actions, and so does `preview` from the preview support; `devtools topics` lists each topic's
actions. Query flags (`--where`, `--json`, `--out` and the rest)
don't go with an action, and action flags don't go with a query: either is an error before the tool
looks for an app. Every action, refused ones too, is listed in the
[CLI tab](https://axonpack.dev/docs/expo-devtools/reference/cli-tab), marked as an action.

#### Action flags

| Flag             | Value                       | Taken by                                                                      | What it does                                                                                                                                                                                                |
| ---------------- | --------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--status`       | whole number, 100 to 599    | `override`                                                                    | The mocked status. Default `200`.                                                                                                                                                                           |
| `--body`         | text                        | `override`, `send`, `replay`                                                  | The body. Default empty for `override`. Not for a GET or HEAD request.                                                                                                                                      |
| `--body-file`    | file path                   | `override`, `send`, `replay`                                                  | Read the body from this file on the computer, as UTF-8 text. Not with `--body`.                                                                                                                             |
| `--content-type` | MIME type                   | `override`                                                                    | The mocked `content-type`. Default `application/json`.                                                                                                                                                      |
| `--header`       | `'Name: value'`, repeatable | `send`, `replay`                                                              | A request header. In `replay` it replaces a header of the same name, any case.                                                                                                                              |
| `--yes`          | none                        | `send`, `replay`, `call`, `switch`, `default`, `download`, `update`, `delete` | Needed for `send` and `replay` with any method but GET, HEAD and OPTIONS, and always for `context call` and for every `preview` action. The app checks it, so a call through the window relay needs it too. |
| `--all`          | none                        | `unoverride`                                                                  | Remove every override instead of one.                                                                                                                                                                       |

#### network actions

Overrides match the exact URL the app requests, scheme and query included, as the Network tab's
own overrides do. There are no patterns or prefixes: copy the URL from a row. They are the same
overrides the tab makes, so they show in its Overrides view and in React Native DevTools. They apply
to `fetch` and `XMLHttpRequest`, and last until the app reloads or they are removed.

| Action       | Args             | Flags                                                   | Reply                                                                                                                                   |
| ------------ | ---------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `override`   | `<url>`          | `--status`, `--body` or `--body-file`, `--content-type` | `# network · override on <url>: <status>, <type>, <n> chars. The app's requests to that exact URL get it, without reaching the network` |
| `block`      | `<url>`          | none                                                    | `# network · blocking <url>: the app's requests to that exact URL fail as if offline`                                                   |
| `unoverride` | `<url>`, or none | `--all` (with no `<url>`)                               | `# network · removed the override on <url>`, or `# network · removed <n> overrides`                                                     |
| `overrides`  | none             | none                                                    | `# network · <n> overrides`, then the columns `url action status type size` (`-` for a block)                                           |
| `send`       | `<METHOD> <url>` | `--header`, `--body` or `--body-file`, `--yes`          | The new row, as below                                                                                                                   |
| `replay`     | `<id>`           | `--header`, `--body` or `--body-file`, `--yes`          | The new row, as below                                                                                                                   |

`send` sends the request from inside the app, through the same function as the Network tab's
Sandbox, and so through the app's own `fetch`. Overrides and network conditions apply to it, and it
is a row in the log like any other request. The method is case-insensitive.

`replay` takes a logged HTTP request and sends it again as the Sandbox would: the same method, URL,
headers and body, with `--header` and `--body` on top. The app's own headers go with it, including
ones the tool shows you only as `[redacted]`. A header that `network.redactHeaders` removed before
the request was logged goes as the text `[redacted]`; pass it again with `--header`.

Both answer with the new row, in the network columns plus `error`:

```
# network · my-app · iPhone 16 Pro · sent POST https://api.example.com/v1/notes as fetch-1762172310455-215. devtools get network fetch-1762172310455-215 shows it whole
id	method	code	state	ms	url	error
fetch-1762172310455-215	POST	201	success	312	https://api.example.com/v1/notes	-
```

`replay` starts `replayed <id> as <new id>`. A request that failed (blocked, offline, no answer) is
still a row, with `state` `error`, and exit code 0. When the request is not in the log (recording
is paused, or `network.redact` dropped it) the reply is
`# network · sent <METHOD> <url>: <status> in <ms> ms. Not in the log: recording is paused, or the app's network redact config dropped it`,
and its body is not shown.

While the request is in flight the app answers `# wait: sending <METHOD> <url> as <id>`, and the
tool asks again every 200 ms within the [5 seconds](#timing). A request that takes longer carries on
in the app. Running the command again would send it again, so the error points at the CLI tab and
`devtools cli` instead, where the action is listed once it ends.

#### context actions

| Action | Args                    | Flags   | Reply                                                                                    |
| ------ | ----------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `call` | `<name> [args as JSON]` | `--yes` | `# context · <name> returned`, then the value as `get context` prints it, or `undefined` |

`call` runs a function the app or a support exposed, the same one the `>` prompt would run, and
nothing else: there is no way to evaluate code from the tool. `<name>` is a row's name or a dot path
into one, such as `preview.status.refresh`, and the function runs with the object before the last
dot as `this`, so a method on a store works.

The arguments are one word of JSON. An array is the list of arguments, and any other JSON value is
the one argument:

| Args                  | The function gets  |
| --------------------- | ------------------ |
| none                  | no arguments       |
| `'"pr-7"'`            | `"pr-7"`           |
| `'["pr-7", 2]'`       | `"pr-7"` and `2`   |
| `'{"type":"logout"}'` | that object        |
| `'[[1, 2]]'`          | the array `[1, 2]` |

A bare word such as `pr-7` isn't JSON and is refused; quote it as `'"pr-7"'`. A function that
returns a promise is waited for: the app answers `# wait: running <name>` and the tool asks again,
as for [`send`](#network-actions). After 5 seconds the tool stops with
`still running <name> after 5 s` and the call carries on in the app; the CLI tab and
`devtools cli --where 'action?'` show how it ended. A function that throws, or a promise that
rejects, answers `error: <its message>`.

#### preview actions

From the [preview support](https://axonpack.dev/docs/expo-devtools/supports/preview#switch-from-the-command-line). They
are the buttons of preview's list, and each needs `--yes`. `switch` and `default` restart the app:
the app answers first and restarts a moment later, or once a preview it has to download is on the
device. The restart clears the [CLI tab](#cli-tab), which keeps its list in memory. `download`, `update` and
`delete` take a preview's id and are refused where the list shows no such button on that preview.

| Action     | Args   | Flags   | Shown in the list                                    | Reply                                                                                                                                           |
| ---------- | ------ | ------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `switch`   | `<id>` | `--yes` | on a server or preview that isn't running            | `# preview · restarting the app on <id>`, ending ` once it has downloaded` for a preview not on the device yet                                  |
| `default`  | none   | `--yes` | while something other than the default runs          | `# preview · restarting the app on the default bundle`                                                                                          |
| `download` | `<id>` | `--yes` | on an `available` preview                            | `# preview · downloaded <id>`                                                                                                                   |
| `update`   | `<id>` | `--yes` | on an `update-available` preview                     | `# preview · updated <id>`, ending `. The app runs the new copy from its next start` for the running one                                        |
| `delete`   | `<id>` | `--yes` | on a preview on the device, unless it is downloading | `# preview · deleted <id>`, or `# preview · deleting <id> and restarting the app on the default bundle` for the preview the app is set to start |

`switch` takes an `id` from the list: a dev server's `host:port` or a preview's id. A preview that
isn't on the device yet downloads first. `default` goes back to the default bundle, as **Back to
default** does. `download` and `update` wait for the download, behind `# wait: downloading <id>` or
`# wait: updating <id>`, and a download that takes over 5 seconds carries on in the app, as a slow
`send` does. A download that fails answers `error:` with preview's own message. `delete` on the
preview the app is set to start goes back to the default bundle first, as the list's **Delete**
does, so the app answers before it restarts.

### Output

Tab-separated, with a header row. In a cell, `-` is an empty value, a tab or line break is written as
`\t`, `\n` or `\r`, `t` is an ISO time, and a string over 2,048 characters ends in
`... [cut at 2048 of <n> chars, --full for all]`.

| Line                                                                                  | When                                                                                                              |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `# <topic> · <app> · <device> · <n> of <total> match`                                 | First line of a list. Ends in `· showing <n>` when `--limit` cut rows off.                                        |
| `# <topic> · <app> · <device> · <n> of <total> match · <k> values of <field>`         | First line of `--group-by`, above `<field>` and `count` columns.                                                  |
| `<n>`                                                                                 | The whole reply to `--count`.                                                                                     |
| `# next: --after <id>`                                                                | Last lines of an unsorted list: the cursor for the next poll. A row still in flight holds it back.                |
| `# more: --before <id>`                                                               | When the limit cut older rows off: the cursor for the next page.                                                  |
| `# <topic> is off: <reason>`                                                          | The whole reply for a topic the app turned off. Exit code 0.                                                      |
| `# <topic> <id>`                                                                      | First line of `get`, above the indented JSON.                                                                     |
| `# <topic>: wrote <n> chars to <file>`                                                | The whole reply with `--out`. With `get` it starts `# <topic> <id>`, and the file holds the JSON alone.           |
| `# paused: the Performance tab records only after record is pressed`                  | Last line of an empty `performance` list while the tab is paused.                                                 |
| `# topics · <app> · <device>`                                                         | First line of `topics`.                                                                                           |
| `# <topic> · <app> · <device> · <what it did>`                                        | First line of an action's reply. See [Actions](#actions).                                                         |
| `# ?: checking would close a DevTools window open on the app. --force checks anyway.` | Under `apps`, when a row shows `?`.                                                                               |
| `# wait: <what>`                                                                      | Never printed. The app says it is still reading, or an action is still sending; the tool asks again every 200 ms. |

`--json` prints none of the `#` lines, so it has no cursors. Each row is one JSON object with the
chosen fields; `--group-by` gives `{ "<field>": value, "count": n }`. Strings are still cut unless
`--full`. With no rows it prints nothing.

### Errors

The app's own errors are one `error: ...` line on stdout. The tool's own errors are one
`error: ...` line on stderr. Both exit with the code shown.

#### From the app

| Message                                                                                       | Code |
| --------------------------------------------------------------------------------------------- | ---- |
| `unknown topic "<name>". Topics: <list>`                                                      | 1    |
| `"<text>" isn't a topic. Pass the topic and each flag as separate arguments: devtools <text>` | 1    |
| `unknown field "<name>" in <topic>. Fields: <list>`                                           | 1    |
| `no <topic> row "<id>", it may have aged out of the buffer`                                   | 1    |
| `bad --limit <n>: use a whole number from 1`                                                  | 1    |
| `bad --where "<clause>": use <field><op><value> with = != > >= < <= ~ !~, or <field>?`        | 1    |
| `bad --where "<clause>": unknown op "<op>". Ops: = != > >= < <= ~ !~`                         | 1    |
| `bad --where "<clause>": <op> needs a number`                                                 | 1    |
| `bad regex <pattern>: <why>`                                                                  | 1    |
| `bad --since "<value>": use 30s, 10m, 2h, 1d or an ISO time` (and `--until`)                  | 1    |

#### From the app, for an action

| Message                                                                                                                                                                                           | Code |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `<topic> has no action "<name>". Actions: <list>`                                                                                                                                                 | 1    |
| `<topic> has no actions, only queries`                                                                                                                                                            | 1    |
| `<topic> is off: <reason>`                                                                                                                                                                        | 1    |
| `usage: devtools <topic> <action> <args>`, such as `usage: devtools network unoverride <url> \| --all`                                                                                            | 1    |
| `<topic> <action> takes no --<flag>. usage: devtools <topic> <action> <args>`                                                                                                                     | 1    |
| `bad --<flag>. usage: ...`, for a value of the wrong kind (only through the window relay)                                                                                                         | 1    |
| `"<url>" is not a whole URL. Use the exact URL the app requests, https:// and query included`                                                                                                     | 1    |
| `bad --status <value>: use 100 to 599`                                                                                                                                                            | 1    |
| `no override on <url>. devtools network overrides lists them`                                                                                                                                     | 1    |
| `bad method "<method>": use GET, POST, ...`                                                                                                                                                       | 1    |
| `<METHOD> can change data on the server, so it needs --yes. GET, HEAD and OPTIONS go without`                                                                                                     | 1    |
| `a GET request has no body, so drop --body` (and `HEAD`)                                                                                                                                          | 1    |
| `bad --header: use 'Name: value'`                                                                                                                                                                 | 1    |
| `no network row "<id>", it may have aged out of the buffer`                                                                                                                                       | 1    |
| `<id> is a WebSocket. replay sends HTTP requests only`                                                                                                                                            | 1    |
| `<METHOD> <url> failed: <why>`, only when the request is also not in the log                                                                                                                      | 1    |
| `switch restarts the app, so it needs --yes` (and `default`)                                                                                                                                      | 1    |
| `no dev server or preview "<id>". devtools preview lists them`                                                                                                                                    | 1    |
| `<id> runs now`                                                                                                                                                                                   | 1    |
| `<id> is downloading. Switch to it once its status is downloaded`                                                                                                                                 | 1    |
| `the default bundle runs now`                                                                                                                                                                     | 1    |
| `download writes the preview to the device, so it needs --yes`, `update replaces the download on the device, so it needs --yes`, `delete removes the download from the device, so it needs --yes` | 1    |
| `no preview "<id>". devtools preview --where kind=preview lists them`                                                                                                                             | 1    |
| `<id> is <status>. Only an available preview downloads`                                                                                                                                           | 1    |
| `<id> is on the device and has an update: devtools preview update <id> --yes`                                                                                                                     | 1    |
| `<id> has no update. It is <status>`                                                                                                                                                              | 1    |
| `<id> isn't on the device`                                                                                                                                                                        | 1    |
| `<id> is downloading. Delete it once the download ends`                                                                                                                                           | 1    |
| `<preview's own error>`, when a download or a delete fails in the app                                                                                                                             | 1    |
| `call runs a function in the app, so it needs --yes`                                                                                                                                              | 1    |
| `no context name "<name>". devtools context lists them` (also for `get context`)                                                                                                                  | 1    |
| `no "<key>" in <path>`, for a dot path that goes further than the value (also for `get context`)                                                                                                  | 1    |
| `<path>: the CLI doesn't reach constructor` (and `prototype`, `__proto__`; also for `get context`)                                                                                                | 1    |
| `<name> is an object, not a function. devtools get context <name> reads it` (and `a value`)                                                                                                       | 1    |
| `the args must be JSON, such as '["a", 1]' for two or '"a"' for one, and <args> isn't`                                                                                                            | 1    |
| `<message>`, when the called function throws or its promise rejects                                                                                                                               | 1    |

#### From the tool

| Message                                                                                                                                                                                                                                               | Code |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `devtools needs Node 22 or newer, and this is Node <version>.`                                                                                                                                                                                        | 1    |
| `unknown flag <flag>. See devtools --help`                                                                                                                                                                                                            | 1    |
| `--<flag> needs a value`                                                                                                                                                                                                                              | 1    |
| `bad --limit <value>: use a whole number from 1` (and `--port`)                                                                                                                                                                                       | 1    |
| `usage: devtools get <topic> <id>. See devtools get --help`                                                                                                                                                                                           | 1    |
| `usage: devtools apps. See devtools apps --help` (and `topics`)                                                                                                                                                                                       | 1    |
| `--status, --body, --body-file, --content-type, --header, --yes and --all go with an action, such as devtools network override <url>. See devtools network --help`                                                                                    | 1    |
| `query flags such as --where, --json and --out don't go with an action, and <topic> <action> is one. See devtools <topic> --help`                                                                                                                     | 1    |
| `pass --body or --body-file, not both`                                                                                                                                                                                                                | 1    |
| `can't read --body-file <path>: <why>`                                                                                                                                                                                                                | 1    |
| `no reply from <app> on <device> in 5 s. Its JS may be paused at a breakpoint: resume it, then run the command again.`                                                                                                                                | 1    |
| `still <what> after 5 s. The app keeps going, so run the same command again to pick up where it stopped.`                                                                                                                                             | 1    |
| `still <what> after 5 s. It carries on in the app, and the CLI tab or devtools cli --where 'action?' shows how it ended.` (an action)                                                                                                                 | 1    |
| `could not reach Metro on port <port>`                                                                                                                                                                                                                | 1    |
| `could not attach to <socket url>`                                                                                                                                                                                                                    | 1    |
| `the debugger socket closed (<code>: <reason>)`                                                                                                                                                                                                       | 1    |
| `the app threw: <message>`                                                                                                                                                                                                                            | 1    |
| `no DevTools window is open on this page`, or another error from the [window relay](https://axonpack.dev/docs/react-native-devtools-tab/reference#calling-the-app-from-a-terminal)                                                                    | 1    |
| ``no app found on Metro ports 8081 to 8090. Open the app in a dev build or Expo Go with `expo start` running, or pass --port.`` (`port <n>` with `--port`)                                                                                            | 2    |
| `no app matches <flags>. Running:`, then a `--app <slug> --device '<device>'` line per app                                                                                                                                                            | 2    |
| `<n> apps match. Pick one:`, then a `--app <slug> --device '<device>'` line per app                                                                                                                                                                   | 2    |
| `<app> on <device> can't share its debugger (React Native below 0.86, or Expo started headless), and metro.config.js has no withDevtools to ask through its DevTools window, so attaching could close one open on it. Pass --force to attach anyway.` | 2    |
| `<app> on <device> has no devtools agent. It needs @axonpack/expo-devtools with <DevtoolsProvider> mounted, in a dev build or Expo Go.`                                                                                                               | 2    |

In `apps`, an app that couldn't be asked shows why in its `note` column instead, such as
`no reply in 5 s: JS may be paused at a breakpoint`.

### Exit codes

| Code | Meaning                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------- |
| `0`  | It answered, including a topic that is off, a query that matched nothing, and a sent request that failed.           |
| `1`  | An error: a bad command or flag, an app's `error:` reply, Node older than 22, a socket error, or no answer in time. |
| `2`  | No app to ask: none running, none or several matching, no devtools in it, or it needs `--force`.                    |

### Timing

| Limit        | Value                                                                |
| ------------ | -------------------------------------------------------------------- |
| Each command | 5 seconds for the app to answer, waits included.                     |
| Asking again | Every 200 ms while the app answers `# wait:`.                        |
| Metro reads  | 2 seconds for each read of `/status`, `/json/list` and the manifest. |

### What it reads

Only what the stores keep, after every redaction in the config. The `authorization`, `cookie` and
`set-cookie` headers and a page's `document.cookie` are always `[redacted]`, in every output, and
filters run on the masked row. An action's reply goes through the same masking. The only changes the
tool can make are the [actions](#actions). See
[Redaction](https://axonpack.dev/docs/expo-devtools/ai-agents#redaction) and
[Older React Native](https://axonpack.dev/docs/expo-devtools/ai-agents#older-react-native).

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
| `children`           | `ReactNode`                            | none     | Your app.                                                                        |

The provider is generic over your theme names, so `config.defaultTheme` only accepts a built-in id or
a key of `config.themes`.

### `DevtoolsConfig`

| Option                               | Type                          | Default     | What it does                                                                                                                                                   |
| ------------------------------------ | ----------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                            | `boolean`                     | `true`      | Whether the devtools run at all. The only gate; see [The panel](#the-panel).                                                                                   |
| `defaultTheme`                       | `ThemeId`                     | `'light'`   | Which theme the panel opens with: a built-in or one of yours.                                                                                                  |
| `themes`                             | `Record<string, ThemeConfig>` | `undefined` | Your own themes: a `base` to inherit and the tokens to override.                                                                                               |
| `network.http`                       | `boolean`                     | `true`      | Capture plain requests, by whatever transport they left on.                                                                                                    |
| `network.websocket`                  | `boolean`                     | `true`      | Capture WebSocket connections and their messages.                                                                                                              |
| `network.sse`                        | `boolean`                     | `true`      | Capture server-sent event streams and their events.                                                                                                            |
| `network.disabledByDefault`          | `boolean`                     | `false`     | Open the Network tab paused.                                                                                                                                   |
| `network.redactHeaders`              | `readonly string[]`           | `[]`        | Header names stored as `[redacted]`, any case. `cookie` also redacts `document.cookie`.                                                                        |
| `network.redact`                     | `(entry) => entry \| null`    | `undefined` | Runs after `redactHeaders` each time a row changes, before it is stored. HTTP and WebSocket rows. `null` drops the row, and so does a throw.                   |
| `console.capture`                    | `boolean`                     | `true`      | Mirror `console.*` into the Console tab, including from declared WebViews.                                                                                     |
| `console.repl`                       | `boolean`                     | `true`      | Show the `>` prompt. Not gated on `__DEV__`.                                                                                                                   |
| `console.context`                    | `Record<string, unknown>`     | `undefined` | Extra names an expression can use, e.g. `{ store, queryClient }`.                                                                                              |
| `console.disabledByDefault`          | `boolean`                     | `false`     | Open the Console tab paused. The prompt still works.                                                                                                           |
| `performance.sampleIntervalMs`       | `number`                      | `1000`      | How often memory is sampled. Each read crosses into the engine, so keep it coarse.                                                                             |
| `performance.longTaskThresholdMs`    | `number`                      | `150`       | Only keep tasks that blocked the JS thread at least this long.                                                                                                 |
| `performance.interactionThresholdMs` | `number`                      | `100`       | Only keep interactions at least this long, event to next paint.                                                                                                |
| `performance.historySize`            | `number`                      | `120`       | How many memory samples, long tasks, user timings and interactions are kept.                                                                                   |
| `performance.disabledByDefault`      | `boolean`                     | `true`      | Open the Performance tab paused. **Defaults to on**, since measuring costs something.                                                                          |
| `storage.adapters`                   | `StorageAdapterDefinition[]`  | `undefined` | The stores the Storage tab can see. Nothing is discovered automatically.                                                                                       |
| `storage.maxKeys`                    | `number`                      | `undefined` | Deprecated and ignored: every key is listed, and values are read as rows are shown.                                                                            |
| `storage.readOnly`                   | `boolean`                     | `false`     | Blanket read-only default; an individual adapter can still set its own.                                                                                        |
| `storage.redactKeys`                 | `(string \| RegExp)[]`        | `[]`        | Keys whose values are shown as `[redacted]`. A string matches a whole key, any case.                                                                           |
| `storage.redact`                     | `(entry) => entry \| null`    | `undefined` | Runs after `redactKeys` on each value read. Change `text`, or return `null` to hide.                                                                           |
| `query.client`                       | `QueryClientLike`             | `undefined` | Your TanStack Query v5 `QueryClient`. Unset leaves the Query tab out of the panel.                                                                             |
| `navigation.disabledByDefault`       | `boolean`                     | `false`     | Open the Navigation tab paused. The route on screen is still shown.                                                                                            |
| `navigation.redact`                  | `(move) => move \| null`      | `undefined` | Runs on every move before it is stored. `null` drops the move, and so does a throw.                                                                            |
| `redux.disabledByDefault`            | `boolean`                     | `false`     | Open the Redux tab paused. The current state is still shown.                                                                                                   |
| `redux.allow`                        | `ActionTypeMatcher[]`         | `undefined` | Record only these action types: a string is exact, a `RegExp` is tested. Empty records all.                                                                    |
| `redux.deny`                         | `ActionTypeMatcher[]`         | `undefined` | Never record these types. Wins over `allow`; more can be added from the panel.                                                                                 |
| `cli.disabledByDefault`              | `boolean`                     | `false`     | Open the CLI tab paused. Agents can still query the app.                                                                                                       |
| `aiUsage.disabledByDefault`          | `boolean`                     | `false`     | Deprecated. The old name of `cli.disabledByDefault`, which wins when both are set.                                                                             |
| `supports`                           | `DevtoolsSupport[]`           | `undefined` | Tabs, command line topics and `>` prompt names for other packages, each from a support's `configure()`. Its provider wraps the app, with `enabled: false` too. |

The Redux tab is there once a store was created with [`devtoolsReduxEnhancer()`](#devtoolsreduxenhancer).

#### Supports

A support connects the devtools to another package. Each has its own entry point,
`@axonpack/expo-devtools/support/<name>/v<major>`, and the main entry has none of them, so an app that
doesn't import one never loads its package. `<major>` is the major version of the package it
supports: import the one that matches the installed version. A new major of that package gets a new
entry, and the old one stays until a major release of expo-devtools removes it. The guide is
[Supports](https://axonpack.dev/docs/expo-devtools/supports).

```ts
import PreviewV0Support from '@axonpack/expo-devtools/support/preview/v0';
// or: import * as PreviewV0Support from '@axonpack/expo-devtools/support/preview/v0';
// or: import { configure, type PreviewConfig } from '@axonpack/expo-devtools/support/preview/v0';

supports: [PreviewV0Support.configure(previewConfig)],
```

Every support module exports the same shape:

| Export              | Kind     | What it is                                                                                   |
| ------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `configure(config)` | function | Takes the package's own config and returns a `DevtoolsSupport` for `supports`. Never throws. |
| `useSupport()`      | hook     | The support's data, from the store its provider fills. The same name in every support.       |
| default export      | object   | The same functions, so a default import and a namespace import read the same.                |
| config types        | types    | The package's config types, re-exported. Named exports only; `any` without the package.      |
| data type           | type     | What `useSupport()` returns.                                                                 |
| `DevtoolsSupport`   | type     | What `configure` returns. Also exported from the main entry.                                 |

Each support keeps its package's data in a store of its own, filled inside its provider from the
package's own state. Besides its tab, its DevTools panel and `useSupport()`, it adds a topic to the
`devtools` command line tool, named after it and listed only while it is in `supports` (see
[Topics from supports](#topics-from-supports)), and it may add names to the [`>` prompt](#the--prompt),
where `console.context` wins a clash. The `devtools` tool's [`context` topic](#context) lists them
too, with the support's id as their `source`, and `devtools context call` runs their functions.

With the devtools on, a support whose package isn't installed, or is on another major, has the
reason logged with `console.error` at start and shown in bold in its tab. Nothing throws, and with
`enabled: false` nothing is logged. With two supports of one id in `supports`, such as two versions
of one support, the first is used and the start logs the other with `console.error`. Installed but
not in `supports`, the package is never loaded. Each package is an optional peer dependency.

| Support | Version | Entry point                                  | For                                     | Types                                                                                                   |
| ------- | ------- | -------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Preview | `v0`    | `@axonpack/expo-devtools/support/preview/v0` | `@axonpack/preview` 0.x, 0.2.0 or later | `PreviewConfig`, `PreviewS3Config`, `DevPreviewServersOptions`, `PreviewSupportData`, `DevtoolsSupport` |

The preview support mounts preview's provider and adds the [Preview tab](#preview-tab), the
[`preview` topic](#preview) with its [actions](#preview-actions), and `preview` in the `>` prompt.
Its `useSupport()` returns `{ status, previews, servers }`: what `usePreviewStatus()` returns (`null`
until preview's provider has rendered), `usePreview().items`, and the dev servers the last look
found. In the prompt, `preview` has `status`, `previews` and `servers`, and `switch(id)`,
`default()`, `download(id)`, `update(id)` and `delete(id)`, the topic's actions with no `--yes`, each
returning the line the `devtools` tool would print, or a promise of it for one that waits. Without `@axonpack/preview` the topic is off, and the start logs and the tab shows: "The devtools config sets up preview, but @axonpack/preview
isn't installed. Install it with `npx expo install @axonpack/preview expo-file-system`, add
`@axonpack/preview` to the plugins in app.json, and rebuild the app." With another major installed,
1.0.0 for example, it logs and shows: "The devtools config uses
@axonpack/expo-devtools/support/preview/v0, which is for @axonpack/preview 0.x, but @axonpack/preview
1.0.0 is installed. Import the support from `@axonpack/expo-devtools/support/preview/v1` instead, and
update @axonpack/expo-devtools if it doesn't have that entry yet." The guide is
[Preview](https://axonpack.dev/docs/expo-devtools/supports/preview).

#### `crash`

Crash capture is the only part of this package that runs with the devtools off, apart from the
supports' providers. The guide is
[Crash reporting](https://axonpack.dev/docs/expo-devtools/crash-reporting).

| Option                               | Type                            | Default     | What it does                                                                                                                       |
| ------------------------------------ | ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `crash.enabled`                      | `boolean`                       | `true`      | Capture at all.                                                                                                                    |
| `crash.enableWhileDevtoolsDisabled`  | `boolean`                       | `false`     | Install the handlers even with `enabled: false`, so a release build still reports crashes. Then only native exceptions are caught. |
| `crash.handlers.jsErrors`            | `boolean`                       | `true`      | The `ErrorUtils` global handler, for fatal and non-fatal JS errors.                                                                |
| `crash.handlers.unhandledRejections` | `boolean`                       | `true`      | Unhandled promise rejections.                                                                                                      |
| `crash.handlers.nativeExceptions`    | `boolean`                       | `true`      | Uncaught Java/Kotlin and Objective-C exceptions, through the native module.                                                        |
| `crash.popupDetail`                  | `'auto' \| 'full' \| 'compact'` | `'auto'`    | Which sheet a crash opens. `'auto'` is full with the devtools enabled, compact without.                                            |
| `crash.disableDefaultLogBox`         | `boolean`                       | `false`     | Uninstall LogBox, warning toasts included, so a JS error is reported here only. Development only.                                  |
| `crash.breadcrumbs`                  | `boolean`                       | `true`      | Attach the recent console, network and navigation entries to each record.                                                          |
| `crash.maxBreadcrumbs`               | `number`                        | none        | Not used yet: a record carries every breadcrumb the tabs hold, whatever this says.                                                 |
| `crash.maxRecords`                   | `number`                        | `25`        | Reports kept in memory.                                                                                                            |
| `crash.persistNonFatal`              | `boolean`                       | `false`     | Also write non-fatal records to disk.                                                                                              |
| `crash.redact`                       | `(record) => record \| null`    | `undefined` | Runs before the record reaches the store, the disk or `onCrash`. `null` drops it.                                                  |
| `crash.onCrash`                      | `(record: CrashRecord) => void` | `undefined` | Your own handler, after `redact`.                                                                                                  |

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
| `mmkvAdapter({ driver })`              | `react-native-mmkv`, both majors — v4's `remove` and v3's `delete` are both accepted. Changes show live.                                          |
| `secureStoreAdapter({ driver, keys })` | `expo-secure-store`. Takes `keys` because the keychain cannot be listed, and an optional `options` passed through to every call.                  |
| `defineStorageAdapter({ ... })`        | Anything else. Duck-types nothing; takes exactly what you hand it.                                                                                |

All four accept `name` (defaulted from the library), `readOnly` and `blacklist`; `defineStorageAdapter` also takes `supportedTypes`. It needs either
`getAllKeys` or a fixed `keys` list — passing `keys` is what turns enumeration off, and it may be a
function, resolved on every read, for an app that keeps its own list of what it stored — and any of
`getItem` (required), `getMany`, `setItem`, `removeItem`, `subscribe`. **Whether the tab can edit or delete is
derived from which of those you provided**, so a store you registered read-only in effect is read-only
in the UI without a flag. Sync functions are fine everywhere: they're awaited, not branched on, and
`kind` only decides the badge the tab shows.

`subscribe(listener)` is how the open tab hears about a write: call `listener` with the key that
changed, and return a function that stops. The tab re-reads only that key, and only if its value
was already read or its row is on screen. A key it hasn't read just joins the list, unread. `mmkvAdapter` builds it from
MMKV's `addOnValueChangedListener`; AsyncStorage and SecureStore have no listener and show changes on
Refresh.

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

| Member                                                                                                                        | What it does                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mark(name, options?)`                                                                                                        | Records a user-timing mark. `options`: `{ detail?, startTime? }`.                                                                                                                      |
| `measure(name, startOrOptions?, endMark?)`                                                                                    | Records a measure. Second argument is a start-mark name or `{ start?, end?, duration?, detail? }`. Passing `start`, `end` **and** `duration` together throws, since they can disagree. |
| `clearMarks(name?)`                                                                                                           | Drops recorded marks, all of them or one name.                                                                                                                                         |
| `clearMeasures(name?)`                                                                                                        | Drops recorded measures, all of them or one name.                                                                                                                                      |
| `setCrashContext(context)`                                                                                                    | Keys attached to every crash record from here on. Replaces rather than merges; `null` clears.                                                                                          |
| `networkLogStore`, `networkConditionsStore`, `consoleLogStore`, `storageStore`, `navigationStore`, `reduxStore`, `crashStore` | The underlying stores, if you want to read or drive them yourself. `navigationStore.getSnapshot()` and `reduxStore.getSnapshot()` return the last 200 moves and actions, newest first. |

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

### `useDevtoolsNavigation(ref, name?)`

Hands the Navigation tab a React Navigation container the provider can't see, one mounted inside the
provider. Call it from the component that owns the container.

```tsx
const navigationRef = createNavigationContainerRef();
useDevtoolsNavigation(navigationRef);
```

`ref` is what `createNavigationContainerRef()` or Expo Router's `useNavigationContainerRef()` returns.
`name` (default `'root'`) files this container's moves under that name, which tells two containers
apart. It does nothing until the devtools are running, so it is safe in a release build.

### `devtoolsReduxEnhancer()`

A Redux store enhancer that feeds the Redux tab. The package takes no redux dependency, so you add it
to the store you already create, after `applyMiddleware`:

```ts
// Redux Toolkit
configureStore({
  reducer,
  enhancers: (getDefault) => getDefault().concat(devtoolsReduxEnhancer()),
});
// Plain Redux
createStore(reducer, compose(applyMiddleware(thunk), devtoolsReduxEnhancer()));
```

Until the provider has started with `enabled: true` it only passes actions on. It records an action
only when it is an object with a string `type`.

### Crash components and formatters

| Export                      | What it is                                                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<CrashReportOverlay />`    | The crash sheet on its own, no props, for a build that ships crash reporting but not the panel. The provider mounts one too; mounting both is harmless.                                      |
| `<DevtoolsErrorBoundary />` | Catches render errors, the only tier with a component stack. Props: `children` (required), `fallback(error, reset)` for your own screen, `onError(error, info)` after the crash is recorded. |
| `formatCrashReport(record)` | A `CrashRecord` as Markdown: title, device table, stack and breadcrumbs. What the sheet's Share and Copy produce.                                                                            |
| `formatCrashJson(record)`   | The whole record as pretty-printed JSON. Never throws.                                                                                                                                       |

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

The 28 tokens of `Palette`:

| Group    | Tokens                                                                                      |
| -------- | ------------------------------------------------------------------------------------------- |
| Surfaces | `background`, `toolbarBackground`, `toolbarOverlay`, `surface`, `sectionTint`, `border`     |
| Chrome   | `toolbarText`, `toolbarTextActive`                                                          |
| Text     | `textPrimary`, `textSecondary`                                                              |
| Status   | `accent`, `pending`, `success`, `error`, `warning`, `errorSurface`, `warningSurface`        |
| Search   | `matchHighlight`                                                                            |
| Syntax   | `keyAccent`, `jsonKey`, `jsonString`, `jsonNumber`, `codeKeyword`, `codeComment`, `codeTag` |
| Charts   | `cpuApp`, `cpuJs`, `cpuUi` (the CPU plot's Total, JavaScript and UI thread lines)           |

`matchHighlight` is the background painted behind text matching the current search. Every built-in
palette sets it to a translucent colour so syntax highlighting still reads through it — keep that
property if you override it.

### Exported types

`DevtoolsConfig`, `DevtoolsNetworkConfig`, `DevtoolsConsoleConfig`, `DevtoolsPerformanceConfig`,
`DevtoolsStorageConfig`, `DevtoolsQueryConfig`, `DevtoolsNavigationConfig`, `DevtoolsReduxConfig`,
`DevtoolsCrashConfig`, `DevtoolsCliConfig` (`DevtoolsAiUsageConfig` is its deprecated old name), `DevtoolsProviderProps`, `DevtoolsPanelControls`,
`DevtoolsWebViewProps`, `BuiltInThemeId`, `ThemeId`, `ThemeConfig`, `Palette`,
`NetworkEntry`, `NetworkLogEntry`, `WebSocketLogEntry`, `NetworkLogStatus`, `ResolvedNetworkConditions`, `ThrottlePresetId`,
`ThrottleProfile`, `UserAgentPresetId`, `ConsoleLogEntry`, `ConsoleLogLevel`, `LongTaskEntry`,
`MemorySample`, `StartupTiming`, `UserTimingEntry`, `MarkOptions`, `MeasureOptions`,
`StorageAdapter`, `StorageAdapterConfig`, `StorageAdapterDefinition`, `StorageAdapterKind`,
`StorageKeyBlacklist`,
`StorageAdapterState`, `StorageEntry`, `StorageReadResult`, `StorageValueType`, `StoredValueKind`,
`AsyncStorageLikeDriver`, `MmkvLikeDriver`, `SecureStoreLikeDriver`, `CrashRecord`, `CrashKind`,
`CrashBreadcrumb`, `CrashBreadcrumbCategory`, `CrashDeviceInfo`, `CrashNativeDetail`,
`CrashPopupDetail`, `DevtoolsErrorBoundaryProps`, `StatusBarStyle`, `QueryClientLike`,
`NavigationMove`, `NavigationRoute`, `NavigationRouterKind`, `NavigationState`,
`NavigationContainerRefLike`, `NavigationContainerLike`, `ReduxAction`, `ReduxActionEntry`,
`ActionTypeMatcher`, `DevtoolsSupport`. From `@axonpack/expo-devtools/support/preview/v0`:
`PreviewConfig`, `PreviewS3Config`, `DevPreviewServersOptions`, `PreviewSupportData` and
`DevtoolsSupport`.

---

## What needs a development build

Everything else works in Expo Go. The native module is loaded optionally, so a missing module dims a
control instead of breaking the panel.

| Feature                     | Without a dev build                                        |
| --------------------------- | ---------------------------------------------------------- |
| Main-thread frame rate      | Reads `dev build`; the JS line still plots.                |
| App memory · Device memory  | Card says `Needs a dev build`.                             |
| CPU usage                   | Plot says `CPU usage needs a development build`.           |
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
