# Agent CLI

Reading what the devtools recorded in a running app from a terminal, for an AI agent or a person,
mocking, blocking or sending a request in it, and calling what the app exposed to the `>` prompt.

## Features

- [x] List the apps running on the dev server, with their device and whether they have the devtools
- [x] List what can be read in an app, with how many rows each part holds
- [x] Every tab can be read: requests, console, performance, storage, the query cache, navigation,
      Redux, crashes and the agent queries themselves
- [x] Search, filter, a time window, sort, pick columns, count and group, the same on every tab
- [x] Open one row whole, or write it to a file
- [x] Poll for new rows and page back to older ones
- [x] Plain tab-separated text, or JSON lines
- [x] Pick one app by name and device when several are running
- [x] Every redaction the app set up holds, and auth headers and cookies are always hidden
- [x] Works on React Native below 0.86 through an open DevTools window, without closing it
- [x] Runs with any package manager, from one npx line
- [ ] Walked end to end on iOS, Android and a phone on the local network
- [x] Act on the network from the terminal: mock or block an exact URL, list and remove those
      overrides, send a request from the app, replay a logged one with edits
- [x] Read and call what the app exposed to the Console tab's `>` prompt (`console.context` and each
      support's names): the `context` topic, `get` with a dot path, and `context call --yes`
- [ ] Act on other tabs: clear a tab, navigate, throttle
- [ ] The commands in the Expo dev server's menu and Expo's own agent tools

## How it works

The tool attaches to the app on the debugger socket Metro already serves and makes one
`Runtime.evaluate` of `globalThis.__AXONPACK_AGENT__.run(query)`. The app filters, pages and
formats, and returns the finished text. Node only prints it. No binding, no session, no Metro
config, only public CDP, so parallel calls are safe.

A tab joins by describing its rows once: what a row is, how to read each field, which columns to
show. Every operation (filters, paging, sort, count, output) is written once and runs over any tab,
so a new tab gets all of them by adding that description and one line in the list of topics.

An action is the same evaluate of a second method, `__AXONPACK_AGENT__.act(call)`. A topic lists
its actions by name, each with how many words it takes, the flags it reads and a handler. The
checks (unknown action, word count, a flag it doesn't take) and the CLI tab record are written
once. `network` and `context` have actions, and so does a support's topic, such as `preview`.

## Decisions worth knowing

- **One evaluate and nothing else.** No `Runtime.enable` and no `Log.enable`, so LogBox is not
  cleared and the socket receives no events. A fresh socket gets its reply in a few milliseconds.
- **The app does the work.** `--since` reads the device's clock, so there is no clock skew, and
  only the matching rows and the chosen fields cross the socket. A raw dump of a tab would be
  megabytes on the JS thread for every call.
- **Read from the stores, never a raw source.** The stores redact before they keep anything, so
  every redaction option holds for the tool with no code of its own. On top, the tool masks
  `authorization`, `cookie`, `set-cookie` and a page's `document.cookie` with no way to turn it off,
  and filters run on the masked row so a search can't probe a masked value.
- **Storage reads the way the tab reads.** Each query lists every store's keys again, keeping the
  values already read, so keys the app wrote since show up for one key listing per store. A list
  reads the values on its page, and a search over values reads every key once. While the app reads,
  it answers `# wait:` and the tool asks again every 200 ms; asking again carries on from there
  rather than listing again. One read per key on the first search is fine for stores the size apps
  keep.
- **Metro's Origin rules.** dev-middleware refuses a debugger socket without an Origin, and Expo
  drops any Origin but exactly `http://127.0.0.1:<port>`. Node's built-in `WebSocket` can send one,
  which is why the tool needs Node 22.
- **`/json/list` is read once per command.** While a device has no page yet it prints a seven-line
  warning in Metro's terminal on every read, so the tool never polls it.
- **The slug comes from the Expo manifest.** In Expo Go every page's app id is the Expo Go app.
- **A 5 second timeout.** A call to an app paused at a breakpoint hangs with no error and is answered
  when it resumes, so the tool gives up on its own and says why.
- **A row in flight holds the poll cursor back**, so the next poll shows how it ended. An open socket
  or a live stream does not, since it can stay open all session.
- **`code` is the HTTP status only.** A socket's close code is its own field, `close`, so
  `code>=400` never takes in a socket that closed normally. The store keeps a 4xx or 5xx answer as
  `success` and the panels paint it red; the tool calls it `error`, so `state=error` is every failed
  request, and `state` is a default column as the panels show a socket's state where a request's
  code goes.
- **On React Native below 0.86** an app takes one debugger, and a second closes the DevTools window.
  There the tool asks through the open window, which `@axonpack/react-native-devtools-tab` relays on
  its own connection, and attaches directly only when no window is open. Without `withDevtools` it
  can't tell, and refuses without `--force`.
- **`context` reads the prompt's own list, never globals.** `configureRepl` keeps the merged names and
  who exposed each (`app` or a support's id), and both the prompt and the topic read that one list,
  so they always agree. The prompt's own `$m` and `$modules` aren't listed. Rows hold the value as a
  console row would (`snapshotValue`), so `--grep` never walks a cycle and a getter is read once per
  query. `get` takes a dot path through the topic's `find`, which the query runner calls in place of
  looking the id up in the rows.
- **`context` redacts as it snapshots.** The topic has no store to redact on write, so every row,
  `get` and `call` result goes through `redactContextValue` (`redact-context.service.ts`) on the
  way out, before printing, cutting, filters or the CLI tab. `console.redactKeys` is tested against
  each dot path segment and, inside `snapshotValue`, against every object and Map key, so a redacted
  key's value is never read. `console.redact` then gets the name or path and that JSON, and a throw
  shows `[redacted]`. A `call` that throws or rejects has its message passed through `redact` too
  (`redactContextError`), since `redactKeys` has no key to match in free text. The matcher is
  `keyMatcher` in `core/utils/key-matcher.util.ts`, shared with `storage.redactKeys`. The `>` prompt
  runs code, so redacting it would only ever be partial, and it isn't.
- **`context call` is no eval.** It resolves a name the app exposed, walks a dot path, and calls the
  function it ends on with the object before it as `this`. A path through `constructor`, `prototype`
  or `__proto__` is refused, since each leads to `Function`. The args are one word of JSON (an array
  is the list, any other value is the one argument), so nothing the tool sends can be code. It
  always needs `--yes`, and a promise is waited for like a request.
- **No middleware chain on the computer side.** It would need raw rows sent over, which is the
  cost the one evaluate avoids. If an outside plugin ever needs to wrap other topics, that is one
  hook in the app, not a chain.
- **Actions reuse what the tab already does.** `override`, `block` and `unoverride` write the same
  overrides store the Network tab's editor writes, so they show in its Overrides view and in
  DevTools. `send` and `replay` go through the Sandbox's own send function and its own way of
  turning a logged row into a request, so there is one fetch path and the request is a row in the
  log like any other.
- **Actions are one more method on the same global.** `act` sits beside `run`, and the relay in
  `@axonpack/react-native-devtools-tab` already calls any own method by name, so actions work
  through an open DevTools window with no change to it.
- **An action that waits is polled.** Hermes returns the promise itself to a
  `Runtime.evaluate` with `awaitPromise` (checked live on iOS), and the relay can't await either. So
  an action that waits answers `# wait:` and the tool asks again with the same call (it carries a
  random `ref`) every 200 ms, as a storage read does. The app keeps the answer until it is asked
  for, at most 20 at once. Running the command again would send the request again, so a timeout
  points at the CLI tab and `devtools cli` instead.
- **`--yes` is checked in the app.** A call through the relay never passes through the CLI, so a
  method other than GET, HEAD and OPTIONS is refused in the handler unless the call says `yes`.
  Those three only read, so they go without.
- **`--status` takes the editor's range, 100 to 599.** `new Response` refuses anything outside 200
  to 599, so the fetch patch builds the override as a 200 and sets the real status, `ok` and
  `statusText` on it (and its `clone`). XMLHttpRequest already reads the status from a getter.
- **Exact URLs only**, as the store already matches. A pattern that matches more than you meant is a
  request you can't explain, and the row the agent copies the URL from always has it whole.
- **A fixed set of action flags.** The tool has to know which flags take a value before it knows the
  action, so `--status`, `--body`, `--body-file`, `--content-type`, `--header`, `--yes` and `--all`
  are parsed for any action and the app refuses the ones an action doesn't take. `--body-file` is
  read by the tool, since the app can't see the computer's files.
- **A replay sends what the app sent.** It rebuilds the request from the stored row, the app's own
  headers included, to the same URL. The agent sees them only masked, in the reply and in the new
  row. A header the app's `redactHeaders` removed before storing is gone, and goes as `[redacted]`.
- **Actions are recorded when they end,** refused ones too, with a masked header shown as
  `[redacted]` and a long body cut to its start in the command.
- **`npx devtools` is the documented form, and `npx @axonpack/expo-devtools` the one that always
  works.** The bin is `devtools`, which is also the name of an unrelated npm package, so in a
  monorepo, or outside the app's folder, `npx devtools` can miss the local install and fetch that
  one. The long form goes only where it must always work: the snippet for `AGENTS.md`, and one
  line in the guide, the CLI reference and `--help` saying when to use it.

## Won't do

- **Expo's dev plugin broadcast socket as the transport.** It sends every message to every client,
  can't target one device, and has no request ids.
