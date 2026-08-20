# Reference

Every control, section and field in the panel, and the whole public API. The
[README](./README.md) is the tour; this is the map.

- [The panel](#the-panel)
- [Network tab](#network-tab)
- [Console tab](#console-tab)
- [Performance tab](#performance-tab)
- [Storage tab](#storage-tab)
- [API](#api)
- [What needs a development build](#what-needs-a-development-build)

Throughout: **dev build** means the feature reads this package's native module, so it is dark in Expo
Go and lights up in a build made with `expo run:ios` / `expo run:android` or EAS. Nothing in the
panel crashes without it: the control says what it needs instead.

---

## The panel

`<DevtoolsOverlay />` renders a draggable floating button. Tapping it opens a full-screen modal; the
button itself never appears inside the modal.

### Header row

| Item         | What it does                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab bar      | **Network**, **Console**, **Performance**, **Storage**, **Crashes**, **Debug**. Scrolls horizontally on a narrow screen.                                   |
| Error badge  | A red count on the Console tab when it isn't the active tab, showing captured `console.error`s. The Crashes tab carries the same badge for unread reports. |
| Palette (🎨) | Opens the theme list; the active one is ticked. Applies immediately.                                                                                       |
| Close (✕)    | Dismisses the panel. Recording carries on while it's closed.                                                                                               |

The tab you last had open is remembered for the life of the app process, so reopening the panel
returns you to it. Only the active tab is mounted, so switching tabs and back resets that tab's
filters, its open detail sheet and its scroll position. Captured data is untouched: it lives in the
stores, not the views.

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

Pausing and `.init()` are different switches, and the difference matters when you ship: until
`.init()` runs, nothing is patched, observed or recorded anywhere. The record button only pauses a
tab that `.init()` already turned on. There is no UI for the `.init()` gate, which is the point of it.

`.init()` is the only gate, and it controls both **capture** and **access**: the overlay subscribes to
whether `.init()` finished and draws nothing until it has, so an unguarded mount in a release build
shows no button rather than a panel over empty lists. There is no config flag that says "off" —
not calling `.init()` is what says it.

The one thing it keeps rendering is the crash report sheet, which is meant to work in production.
Guarding the mount as well is still worth doing; it just is not what keeps the panel out.

---

## Network tab

Three capture paths feed one list: `fetch`, `XMLHttpRequest` (which is what catches axios and most
HTTP client libraries), and any `<WebView>` you wired up. The list holds the **200** most recent
requests; older ones fall off the end. Request and response bodies are kept in full, never truncated.

### Toolbar

| Control           | What it does                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Record / Clear    | As above.                                                                                                              |
| Sort (↓ / ↑)      | Newest first (default) or oldest first.                                                                                |
| Filter (⌕ list)   | Opens the filters panel below.                                                                                         |
| Preserve log (🔖) | On by default. Keeps captured rows when a wired-up **WebView page navigates**; off means the log clears with the page. |
| Export (⤓)        | Opens the OS share sheet with the **currently filtered** list as JSON, named `network-log-<timestamp>.json`.           |
| Settings (⚙)      | Opens the settings panel below.                                                                                        |

### Filters panel

| Field                | What it does                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Search box           | Matches method, URL, status code and source, not header or body text. Clear it with the ✕ inside the box. |
| **Invert** chip      | Shows everything that does _not_ match the search text.                                                   |
| **Type** chips       | `All`, `Fetch/XHR`, `JS`, `Img`, `Media`, `Other`, classified from the response MIME type.                |
| **Method** chips     | `All` plus one chip per method actually captured (`GET`, `POST`, …). No captures, no chips.               |
| **Source** chips     | `All` plus one per source seen: your app, or `WebView::[name]` for each declared browser view.            |
| More filters ▸       | Reveals the two switches below.                                                                           |
| Hide data URLs       | Drops requests whose URL starts with `data:`.                                                             |
| Hide failed requests | Drops requests that errored (network failures, not 4xx/5xx responses).                                    |

Type, method and source filters combine with the search, and the search's **Invert** applies only to
the text match.

### Settings panel

| Setting               | Default        | What it does                                                                                               |
| --------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| Large request rows    | On             | Off gives compact rows: no short name, no badges, URL as the primary line.                                 |
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

The copy menu: **Copy URL**, **Copy as cURL**, **Copy as fetch**, **Copy as fetch (Node.js)**, plus
**Copy request payload** and **Copy response** when those exist.

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

The sheet's ⋮ menu adds **Try in sandbox** above the same copy items as the row menu.

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
shift a little with your import order; the earlier you call `.init()`, the truer _App setup_ is. The
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
[AsyncStorage 12 ▾] │ [⟳] [Filter] │ [⤓]
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
| Filter             | Opens the filter panel, at the top of the scrolling content. Pressing it also scrolls you back up to it.                                                      |
| Export (⤓)         | The currently-filtered entries as JSON through the OS share sheet.                                                                                            |

There is **no record button** — storage is a pull, not a stream, so there is no stream to pause. And
no clear button: that icon means "clear the log" in the other three tabs, and it must never come to
mean "wipe your storage". The tab reads on open and on Refresh; nothing polls.

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
warns about, and this is how you see it for yourself. The crash paths are **not** gated on
`__DEV__`, and they do **not** go through any store, so `.init()` is not what keeps them out of a
release: they work as soon as the panel is on screen. What gates them is whether you rendered
`<DevtoolsOverlay />` at all.

Both crash paths are captured by the Crashes tab when crash reporting is on. A JS crash is reported
before you let go of the button; a main-thread crash ends the process and is read back off disk at the
next launch.

---

## API

### `createDevtoolsClient(config?)`

Returns the client. Call it once, module-scope, and export the instance. Everything else hangs off
it.

| Option                               | Type                          | Default     | What it does                                                                          |
| ------------------------------------ | ----------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `defaultTheme`                       | `ThemeId`                     | `'light'`   | Which theme the panel opens with: a built-in or one of yours.                         |
| `themes`                             | `Record<string, ThemeConfig>` | `undefined` | Your own themes: a `base` to inherit and the tokens to override.                      |
| `webviewSources`                     | `readonly string[]`           | `undefined` | Names of `<WebView>`s allowed to report in, for both the Network and Console tabs.    |
| `network.includeFetch`               | `boolean`                     | `true`      | Capture requests made with `fetch`.                                                   |
| `network.includeXmlHttpRequest`      | `boolean`                     | `true`      | Capture `XMLHttpRequest`. This is what catches axios and most HTTP libraries.         |
| `network.disabledByDefault`          | `boolean`                     | `false`     | Open the Network tab paused.                                                          |
| `console.capture`                    | `boolean`                     | `true`      | Mirror `console.*` into the Console tab, including from declared WebViews.            |
| `console.repl`                       | `boolean`                     | `__DEV__`   | Show the `>` prompt.                                                                  |
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

`webviewSources` uses a `const` type parameter, so the literal names flow into the WebView helpers'
parameter types: passing an undeclared name is a compile error, and at runtime a message from an
undeclared source is dropped.

### Storage adapters

Four factories, all built on the last one. Each returns a `StorageAdapterDefinition` for
`storage.adapters`; ids are assigned from the names at `init()`, suffixed on collision.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

const mmkv = createMMKV();

createDevtoolsClient({
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
});
```

| Factory                                | For                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asyncStorageAdapter({ driver })`      | `@react-native-async-storage/async-storage` and anything copying its API. Uses `getMany` (v3) or `multiGet` (v1/v2) for batch reads when present. |
| `mmkvAdapter({ driver })`              | `react-native-mmkv`, both majors — v4's `remove` and v3's `delete` are both accepted.                                                             |
| `secureStoreAdapter({ driver, keys })` | `expo-secure-store`. Takes `keys` because the keychain cannot be listed, and an optional `options` passed through to every call.                  |
| `defineStorageAdapter({ ... })`        | Anything else. Duck-types nothing; takes exactly what you hand it.                                                                                |

All four accept `name` (defaulted from the library) and `readOnly`. `defineStorageAdapter` needs either
`getAllKeys` or a fixed `keys` list — passing `keys` is what turns enumeration off — and any of
`getItem` (required), `getMany`, `setItem`, `removeItem`. **Whether the tab can edit or delete is
derived from which of those you provided**, so a store you registered read-only in effect is read-only
in the UI without a flag. Sync functions are fine everywhere: they're awaited, not branched on, and
`kind` only decides the badge the tab shows.

`getItem` may return a bare `string | null`, or a `{ text, valueType }` when the type matters — that
second form is how `mmkvAdapter` keeps a stored `1` from rendering as `"1"`, and what an edit is written
back through.

### Client methods

| Member                                                                         | What it does                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `init()`                                                                       | Installs everything: the fetch/XHR patches, the console patch, the REPL context, the performance collectors, your storage adapters, and your themes. Until this runs, nothing is captured and no store is read. Call once, as early as possible. |
| `mark(name, options?)`                                                         | Records a user-timing mark. `options`: `{ detail?, startTime? }`.                                                                                                                                                                                |
| `measure(name, startOrOptions?, endMark?)`                                     | Records a measure. Second argument is a start-mark name or `{ start?, end?, duration?, detail? }`. Passing `start`, `end` **and** `duration` together throws, since they can disagree.                                                           |
| `clearMarks(name?)`                                                            | Drops recorded marks, all of them or one name.                                                                                                                                                                                                   |
| `clearMeasures(name?)`                                                         | Drops recorded measures, all of them or one name.                                                                                                                                                                                                |
| `getWebViewInjectedJavaScriptBeforeContentLoaded(source)`                      | The script to hand a `<WebView>`'s `injectedJavaScriptBeforeContentLoaded`. Covers both requests and console output.                                                                                                                             |
| `handleWebViewMessage(event)`                                                  | Feed a `<WebView>`'s `onMessage` events here. Returns `true` when it consumed one.                                                                                                                                                               |
| `getWebViewRef(source)`                                                        | A ref to attach to the `<WebView>`, so a throttle change reaches an already-open page.                                                                                                                                                           |
| `getWebViewUserAgent()`                                                        | The current user-agent override, for the `userAgent` prop.                                                                                                                                                                                       |
| `shouldAllowWebViewRequest`                                                    | For `onShouldStartLoadWithRequest`. Blocks navigation while Offline is on.                                                                                                                                                                       |
| `networkLogStore`, `networkConditionsStore`, `consoleLogStore`, `storageStore` | The underlying stores, if you want to read or drive them yourself.                                                                                                                                                                               |

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

### `<DevtoolsOverlay />`

| Prop            | Type                              | Default     | What it does                                                       |
| --------------- | --------------------------------- | ----------- | ------------------------------------------------------------------ |
| `iconComponent` | `ComponentType<{ size: number }>` | none        | Renders in place of the built-in glyph. Given the resolved `size`. |
| `size`          | `number`                          | `44`        | Diameter of the button, in dp.                                     |
| `color`         | `string`                          | accent blue | Button fill.                                                       |
| `iconColor`     | `string`                          | `'#ffffff'` | The built-in glyph only; an `iconComponent` colours itself.        |

The button is draggable, stays inside the screen, and keeps a 44dp touch area through `hitSlop` even
at a smaller `size`. Mounting it is also what marks _first render_ for the startup breakdown.

The overlay renders whether or not `.init()` has run: it takes no `enabled` prop and reads no store to
decide. Guard the mount itself when you don't want the panel reachable, as in the README's quick start.

### Themes

A theme patches a base rather than redefining everything:

```ts
createDevtoolsClient({
  defaultTheme: 'midnight',
  themes: {
    midnight: { base: 'dark', colors: { accent: '#a78bfa' } },
  },
});
```

Built-in ids: `light`, `dark`, `dracula`, `nord`, `monokai`, `one-dark`, `solarized-light`. Reuse one
as your own name and you replace it. A `defaultTheme` naming something unregistered is ignored rather
than leaving the panel unstyled. The choice lives in memory for the session. Persisting it would
mean taking a storage dependency for a colour scheme.

The 22 tokens of `Palette`:

| Group    | Tokens                                                                                      |
| -------- | ------------------------------------------------------------------------------------------- |
| Surfaces | `background`, `toolbarBackground`, `toolbarOverlay`, `sectionTint`, `border`                |
| Text     | `textPrimary`, `textSecondary`                                                              |
| Status   | `accent`, `pending`, `success`, `error`, `warning`, `errorSurface`, `warningSurface`        |
| Search   | `matchHighlight`                                                                            |
| Syntax   | `keyAccent`, `jsonKey`, `jsonString`, `jsonNumber`, `codeKeyword`, `codeComment`, `codeTag` |

`matchHighlight` is the background painted behind text matching the current search. Every built-in
palette sets it to a translucent colour so syntax highlighting still reads through it — keep that
property if you override it.

### Exported types

`DevtoolsClientConfig`, `DevtoolsNetworkConfig`, `DevtoolsConsoleConfig`, `DevtoolsPerformanceConfig`,
`DevtoolsStorageConfig`, `DevtoolsOverlayProps`, `BuiltInThemeId`, `ThemeId`, `ThemeConfig`, `Palette`,
`NetworkLogEntry`, `NetworkLogStatus`, `ResolvedNetworkConditions`, `ThrottlePresetId`,
`ThrottleProfile`, `UserAgentPresetId`, `ConsoleLogEntry`, `ConsoleLogLevel`, `LongTaskEntry`,
`MemorySample`, `StartupTiming`, `UserTimingEntry`, `MarkOptions`, `MeasureOptions`,
`StorageAdapter`, `StorageAdapterConfig`, `StorageAdapterDefinition`, `StorageAdapterKind`,
`StorageAdapterState`, `StorageEntry`, `StorageReadResult`, `StorageValueType`, `StoredValueKind`,
`AsyncStorageLikeDriver`, `MmkvLikeDriver`, `SecureStoreLikeDriver`.

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
