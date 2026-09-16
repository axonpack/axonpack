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
  withReactNativeDevtoolsPanel,
} = require("@axonpack/react-native-devtools-tab/metro");

// `id` names the route and the message domain. Tabs name themselves.
module.exports = withReactNativeDevtoolsPanel(getDefaultConfig(__dirname), {
  id: "my-app",
});
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

`ReactNativeDevtoolsPanel.registerTab` as many times as you like. Each becomes its own entry in the DevTools tab strip, with
its own state, its own layout and its own redraws. A tab that reads nothing another tab writes never
redraws when that tab does.

## The tab's symbol

Each tab carries a symbol after its name, defaulting to the Axonpack mark. Pass `icon` to change it:

```ts
ReactNativeDevtoolsPanel.registerTab({ id: 'flags', name: 'Feature flags', icon: '⚑', ... });
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

## Giving it a React component

When the vocabulary is not enough, pass a component:

```tsx
function Session() {
  const [user, setUser] = useState("nobody");
  useEffect(() => auth.onChange(setUser), []);

  return (
    <div>
      <p>signed in as {user}</p>
      <button onClick={() => auth.signOut()}>sign out</button>
    </div>
  );
}

ReactNativeDevtoolsPanel.registerTab({
  id: "session",
  name: "Session",
  component: Session,
});
```

Nothing to build, nothing to serve, nothing to configure. Hooks, effects, context and any component
it composes all work, because this is React.

**It runs in the app, not in the panel.** React renders it here against a renderer that reports what
it drew rather than touching a DOM, and the panel builds the real elements from that. That is what
lets `onClick` reach `auth` directly: the app's own state is in the same place as the handler, so
there is no message to write. It is also why the JSX is `div` and `button` rather than `View` and
`Pressable` — the elements are made at the other end, in a browser.

Changes cross as changes, not as a new tree, so the panel keeps the element it already had. An input
holds its caret and a scrolled list stays where it was while something above re-renders.

What a component cannot do is touch a real element. A `ref` gets a stand-in, so a canvas, a
measurement, or a third-party DOM widget has nothing to work with, and an event arrives as a
description rather than the event itself. For those, give a `page` instead: a path to a component
that the dev server builds for the browser, which then runs where the DOM is.

```ts
registerTab({ id: "flame", name: "Flame", page: "./panel/flame.tsx" });
```

A page is read relative to the project root, and needs `@rsbuild/core`, `react` and `react-dom`
installed there; they are optional peers here because only a project with a page needs them. Edit it
and reload the tab. A page served from somewhere else works too: give `url` and talk to the app with
`createPanelChannel` from `@axonpack/react-native-devtools-tab/panel`.

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
