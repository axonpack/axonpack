# @axonpack/react-native-devtools-tab

Put a tab of your own in React Native DevTools, and talk to the running app through it.

No fork of the DevTools frontend, no browser extension and no second window. A tab is React Native,
built for the web by the Metro you already run, so it is the components you already have.

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
  name: "Session",
  icon: "\u269b",
  component: Session,
});
```

That is the whole API. Call it once per tab, wherever in the app you like, and the tab is there the
next time you open React Native DevTools. Nothing to build, nothing to serve, nothing to configure
beyond one line in `metro.config.js`.

## It is a React Native app, built by your own Metro

A tab's page is not something this package ships. Metro builds your tab module a second time, for
the web, exactly as `expo start --web` would: `react-native` resolves to **react-native-web**, and
the page the panel loads is that bundle.

So `View`, `Text`, `Pressable`, `SafeAreaView`, `FlatList` and `Animated` are not mapped, wrapped or
reinterpreted by anything here. They are react-native-web's, running in a browser, which is what
they already are on the web. A screen the app has can go in a tab and look like itself.

`div` and `button` work too, in the same tree. It is a web page.

```tsx
import { Pressable, Text, View } from "react-native";

export default function Session() {
  const user = useAuth((state) => state.user);

  return (
    <View style={{ padding: 12, gap: 8 }}>
      <Text>signed in as {user}</Text>
      <Pressable onPress={signOut}>
        <Text>sign out</Text>
      </Pressable>
    </View>
  );
}
```

## Where a tab runs, and what that costs

**In the panel, not in the app.** This is the one thing to hold on to, and it decides everything
else.

A tab's bundle is a second JavaScript world with its own copy of every module. A store imported
there is a _different instance_ from the app's: `useAuth` in a tab starts empty and stays empty, no
matter what the app does. There is no shared memory, and calling a function in a tab does not reach
the running app.

That is the price of the components being real. Anything a tab wants from the app has to cross the
debugger connection as a message.

## The tab module

The module that calls `registerTab` is the entry Metro is asked to build, so put every tab in one:

```ts
// devtools.ts, beside metro.config.js
import { ReactNativeDevtoolsPanel } from "@axonpack/react-native-devtools-tab";

import Session from "./tabs/Session";

ReactNativeDevtoolsPanel.registerTab({ name: "Session", component: Session });
```

Import it once from the app so the tab is announced, and it is found without configuration. Name it
something else with the `tabs` option in `metro.config.js`.

Metro builds it twice and the same calls do different things in each: in the app, registering a tab
tells DevTools the tab exists; in the panel, the tab named in the page's URL mounts itself.

## Installing

A tab's page is a web build of your own code, so your app needs what any web build needs:

```sh
bun add -d react-dom react-native-web
```

## The bar at the top

Every tab gets one, drawn by this package: its `name`, and a button that renders the component
again. Nothing to add and nothing to wire up, and your component starts under it.

That button is for state a component reads but React is not watching. Everything else redraws on its
own, because a tab is ordinary React.

## What it cannot do

Touch a real element. A `ref` gets a stand-in, so a canvas, a measurement or a DOM library has
nothing to work with, and an event arrives as `{ type, target: { value, checked } }` rather than the
event itself, with `preventDefault` and `stopPropagation` there but doing nothing.

Everything else a devtools tab usually wants needs none of that: reading the app's state, calling
into it, drawing a table, filtering a list.

## Several tabs

Call `registerTab` once per tab. Each gets its own React root, so one tab re-rendering does not
touch another, and a tab nobody has opened still runs: it is the app rendering, not the panel.

Tabs identify themselves. An id is built from `name` at startup, numbered if two tabs share a name,
and every message is stamped and filtered with it, so two tabs never see each other's traffic and
nothing you write can get that wrong.

## The tab's symbol

`icon` is text shown after the tab's name, defaulting to this package's mark. Any character works,
so an emoji does too. It is text rather than an image because React Native DevTools' own icon slots
take an element, and every way of putting one there loses its drawing.

## How it works

React Native DevTools is a Chrome DevTools frontend fork, served by `@react-native/dev-middleware`.
This serves that same frontend from its own route, adds a nonce to the page's CSP and injects one
script, and that script re-imports the frontend's own modules to reach `InspectorView.addPanel`.
The tab's body is an iframe, and it reaches the device over the debugger connection the frontend
already has, tagged with the tab's own id so it never crosses React DevTools' own traffic.

Inside that iframe is a page this package generates, and the only thing in it is a `<script>` for
`/<your tab module>.bundle?platform=web`, which the dev server already knows how to build. There is
no renderer here, no protocol for what a tab looks like, and nothing of this package's on the page
but a stylesheet for the bar.

Both `@react-native/debugger-frontend` and `@react-native/dev-middleware` are optional peers, so the
copies used are always the ones the running dev server uses. They are versioned in lockstep with
`react-native`, and a mismatch would speak slightly different CDP to the app.

## Playground

`example/` is an Expo app for working on this package. It registers three tabs: one reading and
writing a value the app's own screen shares, one running a command on the machine Metro is on, and
one checking that a string that looks like markup renders as that string.

```sh
cd example && bun run start
```
