# React Native DevTools panel

A second front end for the tabs this package already has, inside React Native DevTools on the
desktop, fed by the same stores the on-device panel reads. Plus a way to hand what you are looking
at straight to Claude Code without copy-paste.

The dev-server half is built and the tab appears. What is left is what the tab shows.

## Business flow

- [x] With the dev server running, opening React Native DevTools shows an Axonpack tab beside
      Console and Sources.
- [ ] The tab lists captured requests, and the list grows as the app makes them.
- [ ] Selecting a request opens the same detail it opens on device, bodies included.
- [ ] Console, storage, performance and crash follow, each showing what the on-device tab shows.
- [ ] Reading on the desktop changes nothing on the device: the on-device panel still opens, still
      records, still works with the dev server gone.
- [x] An app that does not opt in sees no tab and no change at all.
- [ ] A prompt box in the tab answers questions about the project on the developer's machine, with
      the answer streaming in as it is written.
- [ ] A captured request, log or crash can be handed to that prompt in one click, already attached.
- [ ] Nothing here reaches a release build, and nothing here is reachable from another machine.

## How the tab gets there

React Native DevTools is a Chrome DevTools frontend fork, shipped as `@react-native/debugger-frontend`
and served by `@react-native/dev-middleware` under `/debugger-frontend/`. Five steps, all of them
ours, all of them in `src/metro/index.ts`:

1. Serve that same frontend from `/axonpack-devtools`, read from whichever copy the running dev
   server uses. It must not become a dependency of this package, or the frontend and the backend
   disagree about the protocol.
2. Patch `getDevToolsFrontendUrl` in memory so the "open debugger" shortcut points at that route.
   Nothing is written to disk.
3. Intercept the entry page, add a nonce to its existing CSP and a script tag for our host script.
4. The host script waits for the frontend to finish building itself, re-imports the frontend's own
   modules by URL (they are served unbundled from the same origin, so this gets the real
   `InspectorView` singleton), and calls `addPanel`.
5. The panel's body is an iframe. It talks to the device by posting to its parent, which relays over
   the debugger connection the frontend already has.

**This was planned as the part we would not write.** An earlier version of this plan had us shipping
as a plugin of a third-party framework to avoid it. That was reversed: it is about 200 lines, it
needs no dependency, and it does not cost a second debugger connection. The reasons, and the four
platform details that cost the most time, are in
`logs/@axonpack/expo-devtools/2026-09-16-0001-own-devtools-panel-instead-of-a-plugin-host.md`.

## Architecture

Three pieces. The first two are the panel, the third is the terminal.

### App side: one bridge over every store

`src/core/services/devtools-bridge.service.ts`, started by `startDevtools` behind the existing
`config.enabled` gate.

Every store in this package exposes `subscribe(listener)` and `getSnapshot()`, which is what
`useSyncExternalStore` needs and, unchanged, what a bridge needs too. So there is no per-feature
code:

```ts
const STORES = {
  network: networkLogStore,
  console: consoleLogStore,
  performance: performanceStore,
  crash: crashStore,
  storage: storageStore,
} as const;
```

Subscribe to each, and on change send `{ store, entries }` to the panel. Adding a tab later means
adding a line to that record.

**The bridge must attach only while a desktop panel is watching, not at start.** `coalesceNotify`
skips notifying entirely when a store has no listeners, and that is what makes recording with the
panel closed cost "an array write and nothing else". A bridge that subscribes at `init()` turns that
optimisation off for every app that installs the plugin, whether or not anyone opens DevTools. So it
subscribes on the panel's first hello and unsubscribes when the panel goes away.

**The two existing gates stay exactly as they are.** `config.enabled` decides whether anything
records; `paused` is the record button. The bridge is a third reader of the same stores, not a third
gate. A desktop panel reading a paused store correctly sees a frozen list.

### Panel side: the same components, built for the web

Today the panel is a plain HTML string in `src/metro/index.ts` listing store names and row counts.
That is enough to prove the pipe and is not the goal. The goal is a Vite plus `react-native-web`
build under `packages/@axonpack/expo-devtools/panel/`, which needs its own entry in the root
`workspaces` glob for the same reason the example apps do.

The components come over unchanged. `View`, `Text`, `TextInput`, `TouchableOpacity`, `ScrollView`,
`StyleSheet` and `Modal` all have `react-native-web` implementations, and `makeThemedStyles`,
`useThemeColors` and every palette are plain JavaScript.

What does not come over is the store layer: the panel has no access to the app's memory. A generic
`createMirrorStore()` gives back the same `subscribe`/`getSnapshot` pair, fed by bridge messages
instead of by the app. Vite aliases each store module path to its mirror, so no component is edited.

`// ponytail: alias-per-store, fine while components only read stores. A component that imports a`
`// store's writer would silently get a stub. Move to injected context if that ever happens.`

**The icon font has to be shipped as a webfont.** `@expo/vector-icons` resolves to a native font on
React Native and to a `@font-face` on the web. One `@font-face` rule in the panel's entry CSS,
pointing at the `.ttf` already inside that package.

### Wire format

`startDevtoolsBridge` takes anything with `send` and `onMessage`, typed structurally, and
`connectDevtoolsPanel` builds one over the Fusebox dispatcher. The seam is why the bridge is testable
without a device, which is how it is tested.

**Messages are serialised into a `Runtime.evaluate` expression string, JSON-encoded twice per hop.**
A 200-entry network log with whole bodies is megabytes, and the store notifies once a frame. So:

- Lists travel without bodies. Strip `requestBody`, `responseBody`, `responseBase64` and
  `requestFields` before sending.
- The detail panel asks for one entry's bodies by id when it opens one. This is what a browser's own
  network tab does, and it means the full-fidelity, no-truncation promise survives the trip.

### Terminal side: a dev-server route, not a terminal emulator

One more route in the `./metro` export, beside the ones that already serve the panel.

The route spawns `claude -p <prompt> --output-format stream-json --verbose` with `cwd` set to the
project root, and streams its NDJSON stdout back over SSE. The CLI already has a headless mode that
emits structured events, so there is no pty, no shell and no terminal emulator to build.

**A dev-server route that spawns a process is remote code execution on the developer's machine for
anything that can reach the port, and Metro binds every interface.** This is the part of the plan
that does not get simplified:

- Off unless explicitly turned on, and never on by default.
- Reject any request whose remote address is not loopback.
- Require a token generated at server start and handed to the panel through the config channel. The
  loopback check alone does not stop a web page the developer has open from calling `localhost`.
- `spawn` with an argv array and `shell: false`. The prompt is an argument, never a command line.
- One run at a time, killed when the client disconnects.

## Order of work

1. **A panel that renders.** Vite workspace, plugin manifest, one component saying whether the
   bridge is connected. Ends with: an Axonpack tab in React Native DevTools.
2. **The bridge, with console only.** Ends with: a `console.log` in the app appearing in the desktop
   tab.
3. **The store loop and the mirror aliases.** Ends with: network, storage, performance and crash
   lists live on the desktop, bodies excluded.
4. **Bodies on demand.** Ends with: the request detail panel showing a full response on the desktop.
5. **The middleware and the Claude route.** Ends with: a prompt typed in the panel answered in the
   panel.
6. **Hand-off from a row.** Ends with: a failing request sent to Claude Code with no copy-paste.

Steps 1 to 4 are worth shipping without 5 and 6. Steps 5 and 6 are worth nothing without 1.

## Not in this plan

- **Writing from the desktop panel.** No storage edits, no REPL, no record or clear buttons. Reads
  only. A write path needs its own think about what a desktop tab is allowed to do to a device.
- **Publishing the panel separately.** One package, one extra export.
- **Lynx and Re.Pack.** Neither is tested.
- **A real interactive terminal.** `claude -p` covers the ask. A pty plus xterm.js is the upgrade
  path if a live session is genuinely wanted.
- **Replacing the on-device panel.** This is a second front end. The device stays the only one that
  works without a dev server, which is the whole reason this package exists.

## Open decisions

- **Whether the panel is one tab or several.** One tab is registered today, and the panel carries its
  own sub-navigation the way the on-device panel's tab bar does. Five entries in the DevTools tab
  strip is the alternative, and nothing so far argues for it.
- **Body transfer ceiling.** Fetch-on-demand is planned above. Not yet decided whether a very large
  body needs chunking, because the size at which `Runtime.evaluate` actually fails is not measured.
  Measure it in step 4 rather than guessing now.
