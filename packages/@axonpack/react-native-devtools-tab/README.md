# @axonpack/react-native-devtools-tab

Put a tab of your own in React Native DevTools, and talk to the running app through it.

No fork of the DevTools frontend, no browser extension, no second window, and no bundler: you
describe what the tab shows and this renders it.

## Install

```sh
bun add @axonpack/react-native-devtools-tab
```

## Use

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const {
  withDevtoolsTab,
} = require("@axonpack/react-native-devtools-tab/metro");

// `id` names the route and the message domain. Tabs name themselves.
module.exports = withDevtoolsTab(getDefaultConfig(__dirname), { id: "my-app" });
```

```ts
// anywhere in the app, behind __DEV__
import { createDevtools, ref } from "@axonpack/react-native-devtools-tab";

const devtools = createDevtools({ id: "my-app" });

const session = devtools.registerTab({
  id: "session",
  name: "Session",
  icon: "⚑", // optional; defaults to the Axonpack mark
  state: { user: "nobody", calls: [] as string[][] },
  layout: {
    kind: "stack",
    children: [
      { kind: "field", label: "user", value: ref("user") },
      { kind: "table", columns: ["method", "url"], rows: ref("calls") },
      { kind: "button", label: "Sign out", action: "signOut", tone: "error" },
    ],
  },
});

session.setState({ user: "ada@example.com" });
session.onAction("signOut", () => auth.signOut());
```

Restart Metro and reopen React Native DevTools.

## Layouts go once, state goes often

**The layout is registered, not sent.** It crosses the wire once, when the tab registers, and holds
a `ref` wherever it needs a value. After that the app sends only data:

```ts
session.setState({ user: "ada@example.com" }); // one slice, one small message
```

Each key of `state` is a **slice**, and a slice is the unit of both updates and redraws. When a tab
registers, the panel works out which slices its layout actually reads. An update to a slice nothing
reads changes the state and redraws nothing.

`ref('user.email')` reads into a slice; the slice is still `user`, which is what decides redraws.

## Several tabs

`DevTools.registerTab` as many times as you like. Each becomes its own entry in the DevTools tab strip, with
its own state, its own layout and its own redraws. A tab that reads nothing another tab writes never
redraws when that tab does.

## The tab's symbol

Each tab carries a symbol after its name, defaulting to the Axonpack mark. Pass `icon` to change it:

```ts
DevTools.registerTab({ id: 'flags', name: 'Feature flags', icon: '⚑', ... });
```

Any character works, including an emoji. It is text rather than an image: React Native DevTools' own
icon slots take an element, and every way of putting one there loses its drawing. The suffix slot
re-renders with a shallow `cloneNode()`, and the leading slot only accepts a name from DevTools' own
image set.

## What you can describe

`text`, `heading`, `badge`, `field`, `divider`, `row`, `stack`, `table`, `json`, `button`, `input`,
and `when` for one of two branches. Every node is a plain object, so a layout is data.

The vocabulary is deliberately small. Anything it cannot express is a reason to add a node, not a
reason to make a node configurable enough to express everything.

## The channel underneath

Everything hangs off the one object, because an app has one debugger connection. There is no instance
to create and nothing to pass around.

The described UI is one message type on a general channel. Everything else is yours:

```ts
tab.send("metrics", collect());
tab.onMessage("reset", () => store.clear());

// request/response, in either direction
tab.handle("user", () => currentUser());
const answer = await tab.request("ping");
```

Nothing is sent until somebody opens the tab, and what you send before that is kept and flushed when
they do. A release build has no debugger connection at all, so the channel stays quiet.

## Drawing it yourself

If the vocabulary is not enough, ignore it and serve your own page:

```ts
import { createPanelChannel } from "@axonpack/react-native-devtools-tab/panel";

const app = createPanelChannel();
app.onMessage("metrics", render);
```

## How it works

React Native DevTools is a Chrome DevTools frontend fork, served by `@react-native/dev-middleware`.
This serves that same frontend from its own route, adds a nonce to the page's CSP and injects one
script, and that script re-imports the frontend's own modules to reach `InspectorView.addPanel`.
The tab's body is an iframe, and it reaches the device over the debugger connection the frontend
already has, tagged with your `id` so it never crosses React DevTools' own traffic.

Both `@react-native/debugger-frontend` and `@react-native/dev-middleware` are optional peers, so the
copies used are always the ones the running dev server uses. They are versioned in lockstep with
`react-native`, and a mismatch would speak slightly different CDP to the app.

## Playground

`example/` is an Expo app for working on this package. It renders one described UI at a time, and
logs whatever the tab sends back, so both directions are visible on one screen.

```sh
cd example && bun run start
```

Open React Native DevTools and look for the **Playground** tab. Its samples cover every node kind,
every tone, a ragged table, a live counter that redescribes once a second, and a page of text that
must never be treated as markup. The app also exposes `ping`, `echo`, `slow` and `boom` over RPC,
for anything calling in the other direction.

Note the route is `/playground-devtools/`, not this package's name: the `id` names the route, the
message domain and the tab, so two apps on one machine never collide.
