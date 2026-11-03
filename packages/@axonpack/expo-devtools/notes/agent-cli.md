# Agent CLI

Reading what the devtools recorded in a running app from a terminal, for an AI agent or a person.

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
- [ ] Act from the terminal: clear a tab, override a response, navigate, throttle
- [ ] The commands in the Expo dev server's menu and Expo's own agent tools

## How it works

The tool attaches to the app on the debugger socket Metro already serves and makes one
`Runtime.evaluate` of `globalThis.__AXONPACK_AGENT__.run(query)`. The app filters, pages and
formats, and returns the finished text. Node only prints it. No binding, no session, no Metro
config, only public CDP, so parallel calls are safe.

A tab joins by describing its rows once: what a row is, how to read each field, which columns to
show. Every operation (filters, paging, sort, count, output) is written once and runs over any tab,
so a new tab gets all of them by adding that description and one line in the list of topics.

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
- **Storage reads the way the tab reads.** The first question about a store lists its keys, a list
  reads the values on its page, and a search over values reads every key once. While the app reads,
  it answers `# wait:` and the tool asks again every 200 ms. One read per key on the first search is
  fine for stores the size apps keep.
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
- **On React Native below 0.86** an app takes one debugger, and a second closes the DevTools window.
  There the tool asks through the open window, which `@axonpack/react-native-devtools-tab` relays on
  its own connection, and attaches directly only when no window is open. Without `withDevtools` it
  can't tell, and refuses without `--force`.
- **No middleware chain on the computer side.** It would need raw rows sent over, which is the
  cost the one evaluate avoids. If an outside plugin ever needs to wrap other topics, that is one
  hook in the app, not a chain.
- **Read-only first.** Actions would be an optional key on a topic, added when there is a need.
- **`npx devtools` is the documented form, and `npx @axonpack/expo-devtools` the one that always
  works.** The bin is `devtools`, which is also the name of an unrelated npm package, so in a
  monorepo, or outside the app's folder, `npx devtools` can miss the local install and fetch that
  one. The long form goes only where it must always work: the snippet for `AGENTS.md`, and one
  line in the guide, the CLI reference and `--help` saying when to use it.

## Won't do

- **Expo's dev plugin broadcast socket as the transport.** It sends every message to every client,
  can't target one device, and has no request ids.
