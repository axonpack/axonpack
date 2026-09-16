# @axonpack/react-native-devtools-tab

Put a tab of your own in React Native DevTools, and talk to the running app through it.

No fork of the DevTools frontend, no browser extension, no second window, and no bundler: you
describe what the tab shows and this renders it.

## Install

```sh
bun add @axonpack/react-native-devtools-tab
```

## Use

```tsx
import { ReactNativeDevtoolsPanel } from "@axonpack/react-native-devtools-tab";

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
  icon: "\u269b",
  component: Session,
});
```

That is the whole API. Call it once per tab, wherever in the app you like, and the tab is there the
next time you open React Native DevTools. Nothing to build, nothing to serve, nothing to configure
beyond one line in `metro.config.js`.

## It runs in the app

React renders your component **here, in the app**, against a renderer that reports what it drew
instead of touching a DOM. The panel builds the real elements from the changes that arrive.

That is what lets `onClick` call `auth.signOut()` directly: the handler and the app's own state are
in the same place, so there is no message to write and no state to mirror. Hooks, effects, context
and any component you compose all work, because this is React.

It is also why the JSX is `div` and `button` rather than `View` and `Pressable`. The elements are
made at the other end, in a browser.

Changes cross as changes, not as a new tree, so the panel keeps the element it already had. An input
holds its caret and a scrolled list stays where it was while something above it re-renders.

## Talking to the app

A tab's component runs in the app, so most of this is not communication at all.

- **Tab to app:** call it. `onClick={() => auth.signOut()}` is a function call, not a message.
- **App to tab:** share the value, and both sides read it with the same hook.

```tsx
const session = ReactNativeDevtoolsPanel.state({ user: "nobody" });

function Session() {
  const { user } = session.use();
  return (
    <button onClick={() => session.set({ user: "ada" })}>
      signed in as {user}
    </button>
  );
}
```

`session.use()` works in the tab and in the app's own screens alike, on the same object, so either
one setting it redraws the other. `get` and `subscribe` are there for everything that is not a
component. Setting a value to what it already was redraws nothing.

Any state library the app already uses works the same way, because a tab is real React: Zustand,
Jotai, MobX, an emitter. What does not reach a tab is **React context** — a tab is its own root, so
the app's providers are in a different tree.

`registerTab` also returns `{ redraw }`, for state that lives somewhere neither of those covers.

## The bridge

`send`, `onMessage`, `request` and `handle` on `ReactNativeDevtoolsPanel` ride the debugger
connection the tabs use, and it is generic in both directions. It is how the render itself crosses.

A tab does not need it: with the component in the app, both ends of that bridge belong to this
package, so there is nothing of yours on the far side to talk to.

## What it cannot do

Touch a real element. A `ref` gets a stand-in, so a canvas, a measurement or a DOM library has
nothing to work with, and an event arrives as `{ type, target: { value, checked } }` rather than the
event itself, with `preventDefault` and `stopPropagation` there but doing nothing.

Everything else a devtools tab usually wants — reading the app's state, calling into it, drawing a
table, filtering a list — needs none of that.

## Several tabs

Call `registerTab` once per tab. Each gets its own React root, so one tab re-rendering does not
touch another, and a tab nobody has opened still runs: it is the app rendering, not the panel.

## The tab's symbol

`icon` is text shown after the tab's name, defaulting to this package's mark. Any character works,
so an emoji does too. It is text rather than an image because React Native DevTools' own icon slots
take an element, and every way of putting one there loses its drawing.

## The channel underneath

`send`, `onMessage`, `request`, `handle`, `expose` and `remote` sit on the same debugger connection
the tabs use, for talking to anything else listening on it. Tabs need none of them.

## How it works

React Native DevTools is a Chrome DevTools frontend fork, served by `@react-native/dev-middleware`.
This serves that same frontend from its own route, adds a nonce to the page's CSP and injects one
script, and that script re-imports the frontend's own modules to reach `InspectorView.addPanel`.
The tab's body is an iframe, and it reaches the device over the debugger connection the frontend
already has, tagged with your `id` so it never crosses React DevTools' own traffic.

Inside that iframe is a custom React reconciler's other half. The app's React commits produce a list
of changes — create this node, move that one, set these props — and the page replays them onto real
elements. A function prop cannot be sent, so each is swapped for the position it sits at in the tree;
the page calls back with that position and the app runs the closure it stands for.

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
