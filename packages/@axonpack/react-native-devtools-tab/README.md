# @axonpack/react-native-devtools-tab

Put a tab of your own in React Native DevTools, and talk to the running app through it.

Your tab is part of the app, so it can use whatever the app can. Import your store and read it. When
that state changes, the tab updates with it, because it is the same state and not a copy of it. A
button in the tab calls your real function.

No fork of the DevTools frontend, no browser extension, no second window, and no bundler: you
describe what the tab shows and this renders it.

[Watch the demo](https://youtu.be/qMN6QO-qlF4)

## Install

```sh
bun add @axonpack/react-native-devtools-tab
```

React 19.2 or newer is the one declared peer, and the Metro side wants Node 20 or newer. The tab
lives in React Native DevTools, so the app has to be one whose debugger is that rather than the old
Chrome remote debugger.

## Set it up

Two files of your own, plus one line in the Metro config.

### 1. Wrap the Metro config

This is what serves the tab to the DevTools page.

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const {
  withReactNativeDevtoolsTab,
} = require("@axonpack/react-native-devtools-tab/metro");

module.exports = withReactNativeDevtoolsTab(getDefaultConfig(__dirname));
```

A bare React Native app is the same line with its own default config, from
`@react-native/metro-config`.

### 2. Write a tab and register it

A tab is any React component, and `registerTab` takes it. One file does both:

```tsx
// devtools.tsx
import { useState } from "react";
import { ReactNativeDevtoolsPanel } from "@axonpack/react-native-devtools-tab";

function Session() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 12 }}>
      <p>pressed {count} times</p>
      <button onClick={() => setCount(count + 1)}>press</button>
    </div>
  );
}

ReactNativeDevtoolsPanel.registerTab({
  name: "Session",
  icon: "\u269b",
  component: Session,
});
```

`name` is the label in the tab strip and what the tab's id is built from. `icon` is optional text
shown after it. `component` is what the tab draws. Call `registerTab` again in the same file for a
second tab, and split the components out into their own files whenever the file stops being
comfortable.

The JSX can be `div` and `button` because the elements are made in a browser, at the panel's end. It
can equally be React Native, which the panel draws with react-native-web:

```tsx
import { Pressable, Text, View } from "react-native";

function Session() {
  const [count, setCount] = useState(0);

  return (
    <View style={{ padding: 12, gap: 8 }}>
      <Text>pressed {count} times</Text>
      <Pressable onPress={() => setCount(count + 1)}>
        <Text>press</Text>
      </Pressable>
    </View>
  );
}
```

Layout, text and presses come through. What does not is behaviour that lives in native code rather
than in the JavaScript, so `SafeAreaView` lays out with no insets and a natively driven `Animated`
sits still. [It runs in the app](#it-runs-in-the-app) is where that line sits.

### 3. Pull that file in when the app starts

`devtools.tsx` is pulled in for its side effect, so it needs no export. Put the line in
`app/_layout.tsx` for Expo Router, or `App.tsx` otherwise:

```tsx
// app/_layout.tsx
if (__DEV__) require("../devtools");

export default function Layout() {
  // your app, unchanged
}
```

Calling `registerTab` later works too, and so does a plain `import "../devtools"`. The `__DEV__`
guard is what keeps the tabs out of a release bundle. [In a release build](#in-a-release-build) has
the detail.

Restart Metro, open React Native DevTools, and the tab is in the strip beside Console and Sources.
If it is not, [when the tab does not appear](#when-the-tab-does-not-appear) lists what each failure
prints.

## It runs in the app

React renders your component **here, in the app**, against a renderer that reports what it drew
instead of touching a DOM. The panel builds the real elements from the changes that arrive.

That is what lets `onClick` call `auth.signOut()` directly: the handler and the app's own state are
in the same place, so there is no message to write and no state to mirror. Hooks, effects and any
component you compose all work, because this is React.

It is also why the JSX can be `div` and `button`. The elements are made at the other end, in a
browser.

It can equally be `View`, `Text`, `Image`, `ScrollView` and `Pressable`. Those reach the panel as the
host elements React Native compiled them to (`RCTView`, `RCTText`), and the panel draws them with
**react-native-web**, the library that renders a React Native app in a browser. Yoga's defaults, the
units, the text layout and the stylesheet are its job, in the page where it has a real document.

What crosses is host output, so a component whose behaviour is native code does not get that
behaviour: `SafeAreaView` lays out but has no insets, an SVG path is an empty box, and `Animated`
driven natively sits at its first value. Layout, text and presses come through.

This is the trade the package makes on purpose. A tab could instead be built for the web by your own
Metro, which renders every React Native component perfectly, and it would then be a separate
JavaScript world that cannot see one value of the app's. Reading the running app is the point, so
the app is where a tab runs.

Changes cross as changes, not as a new tree, so the panel keeps the element it already had. An input
holds its caret and a scrolled list stays where it was while something above it re-renders.

## Talking to the app

A tab's component runs in the app, so most of this is not communication at all.

- **Tab to app:** call it. `onClick={() => auth.signOut()}` is a function call, not a message.
- **App to tab:** whatever the app already uses to hold state. A tab is real React, so `useState`,
  an emitter, Zustand, Jotai and MobX all work as they do anywhere else.

A store is a store. This one is plain React, with no library:

```ts
// store.ts
import { useSyncExternalStore } from "react";

let value = { user: "nobody", requests: 0 };
const listeners = new Set<() => void>();

export const session = {
  get: () => value,

  set(next: typeof value) {
    value = next;
    for (const listener of listeners) listener();
  },

  use: () =>
    useSyncExternalStore(
      (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      () => value,
    ),
};
```

The tab imports it like any other file, because it is running in the app where that file already
lives:

```tsx
// devtools.tsx
import { session } from "./store";

export default function Session() {
  const { user, requests } = session.use();

  return (
    <div style={{ padding: 12 }}>
      <p>
        {user}, {requests} requests
      </p>
      <button onClick={() => session.set({ user: "nobody", requests })}>
        sign out
      </button>
    </div>
  );
}
```

`session.use()` is the same hook your screens call, on the same object. Press a button on a screen
and the tab follows, because there is one value and not a copy of one.

What does not reach a tab is **React context**: a tab is its own root, so the app's providers are in
a different tree.

## The bar at the top

Every tab gets one, drawn by this package: its `name`, and a button that renders the component
again. Nothing to add and nothing to wire up, and your component starts under it.

That button is for state a component reads but React is not watching. Everything else redraws on its
own, because a tab is ordinary React.

## Text inputs

Use `defaultValue`, not `value`.

A controlled `TextInput` keeps its native view in step by sending it a command, and a tab has no
native view: the ref it gets is a stand-in, so React Native warns that `dispatchCommand` was given a
ref that is not a native component, and typing throws. Uncontrolled, it never asks, and
`onChangeText` still arrives on every keystroke.

```tsx
<TextInput defaultValue="" onChangeText={setQuery} />
```

Clear it by remounting, which is what a `key` that changes does. A `div`-and-`input` tab has none of
this, because React and the browser own both ends of it.

## What it cannot do

Touch a real element. A `ref` gets a stand-in, so a canvas, a measurement or a DOM library has
nothing to work with, and an event arrives as `{ type, target: { value, checked } }` rather than the
event itself, with `preventDefault` and `stopPropagation` there but doing nothing.

Everything else a devtools tab usually wants needs none of that: reading the app's state, calling
into it, drawing a table, filtering a list.

Copying is the one thing a handler cannot do for you, since it runs in the app and lands on the
device's clipboard. Give the element `COPY_ATTRIBUTE` with the text instead, and the panel copies it
to the computer's clipboard on the click:

```tsx
import { COPY_ATTRIBUTE } from "@axonpack/react-native-devtools-tab";

<button {...{ [COPY_ATTRIBUTE]: curl }}>Copy as cURL</button>;
```

A download needs nothing special: an `<a href="data:…" download="name">` is a real link in the
panel, and the browser saves it.

## Opening DevTools on your tab

`registerTab` returns the tab, with one method. `focus()` shows the tab in a DevTools window that
is already open, and in the next one that connects, so calling it just before the app opens
DevTools lands the window on it:

```tsx
import { TurboModuleRegistry } from "react-native";

const tab = ReactNativeDevtoolsPanel.registerTab({
  name: "Session",
  component: Session,
});

// Later, from a button in the app, in a debug build:
tab.focus();
// React Native's own DevSettings: openDebugger is what the dev menu's Open DevTools calls.
TurboModuleRegistry.get<{ openDebugger?: () => void }>(
  "DevSettings",
)?.openDebugger?.();
```

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

## In a release build

`registerTab` is safe to call unguarded. A release build installs no debugger dispatcher, so nothing
connects, your component is never rendered, and its effects never run. All the call costs is an entry
in an array.

To keep the tabs out of the release bundle as well, put the calls in a module of their own and pull
it in behind `__DEV__`:

```tsx
if (__DEV__) require("../devtools");
```

Metro replaces `__DEV__` with `false` and folds the dead branch away _before_ it collects
dependencies, so that module and everything it imports is left out of the bundle entirely. It has to
be a `require` rather than an `import`, because an `import` is hoisted and runs whatever the branch
around it says.

The Metro wrap costs a release bundle nothing either way. The only thing it adds to the config is
`server.enhanceMiddleware`, which nothing but a dev server reads. It touches no transformer, no
resolver and no serializer, so the bundle is the same with it as without.

The config is also the one place that `__DEV__` guard does not work. The global belongs to the app's
bundle, while `metro.config.js` runs in Node, where it does not exist, so `if (!__DEV__) return
config` throws before Metro starts. Metro reads the config when building for release too, so the
package has to be installed then: keep it out of `devDependencies` if your release install skips
those.

## When the tab does not appear

Every failure says so, either in Metro's output or in the DevTools console.

**`[devtools] React Native DevTools was not found, so no tab is served.`** The helper could not
resolve `@react-native/debugger-frontend` from your project. A monorepo that hoists oddly is the
usual cause, and `frontendPath` is the way out:

Ask your project for the path. The package's entry point exports it as a string, so this prints it:

```sh
node -p "require('@react-native/debugger-frontend')"
```

Run that from your app's directory, and hand the result over:

```js
module.exports = withReactNativeDevtoolsTab(getDefaultConfig(__dirname), {
  frontendPath:
    "/your/app/node_modules/@react-native/debugger-frontend/dist/third-party/front_end",
});
```

Note how deep it sits. It is the directory the files are actually in, several levels below the
package root, not the package root itself. `ls` it and you should see `rn_fusebox.html`, which is
the page DevTools opens. If the `node -p` fails too, the package is genuinely not installed where
your app can see it, and the fix is the install rather than this option.

**`[devtools] could not point the debugger shortcut at the tab.`** The frontend was found but
`@react-native/dev-middleware` was not, so DevTools opens on its own route with no tab script in it.
Two copies of that package in one install is the usual reason.

**`[devtools] the app never installed its devtools dispatcher`** Printed in the DevTools console
after ten seconds of asking. The panel is up and the app is not answering, so either the app's bundle
never pulled this package in, or it did so behind a `__DEV__` guard in a build where that is false.

Nothing printed at all, and no tab: Metro was not restarted after the config changed.

## How it works

React Native DevTools is a Chrome DevTools frontend fork, served by `@react-native/dev-middleware`.
This serves that same frontend from its own route, adds a nonce to the page's CSP and injects one
script, and that script re-imports the frontend's own modules to reach `InspectorView.addPanel`.
The tab's body is an iframe, and it reaches the device over the debugger connection the frontend
already has, tagged with the tab's own id so it never crosses React DevTools' own traffic.

Inside that iframe is a custom React reconciler's other half. The app's React commits produce a list
of changes (create this node, move that one, set these props) and the page replays them onto real
elements. A function prop cannot be sent, so each is swapped for the position it sits at in the tree;
the page calls back with that position and the app runs the closure it stands for.

Neither `@react-native/debugger-frontend` nor `@react-native/dev-middleware` is declared here. Both
already arrive with `react-native` and are versioned in lockstep with it, so the Metro helper
resolves them at run time starting from whatever is serving your project. The copy it uses is
therefore the copy your dev server uses. A pin of our own could land a version that speaks slightly
different CDP to your app.

## Playground

`example/` is an Expo app for working on this package. It registers five tabs: a counter sharing a
value with the app's own screen, a shell running a command on the machine Metro is on, a check that a
string which looks like markup renders as that string, a reader for the app's MMKV store, and one
querying its SQLite database.

```sh
cd example && bun run start
```
