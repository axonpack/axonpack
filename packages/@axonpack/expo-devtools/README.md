<div align="center">

<img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/logo.png" width="88" alt="Axonpack" />

# @axonpack/expo-devtools

**Browser-style devtools that live inside your React Native or Expo app.**

Tap a floating button for six tabs on the device itself: **Network** (every request, resendable, with
throttling), **Console** (every log, plus a prompt that answers), **Performance** (frame rate, memory,
the moments the app froze), **Storage** (every key you've saved), **Crashes** and **Debug**. No desktop
debugger, no cable, and nothing captured unless you switch it on.

**[Documentation](https://axonpack.github.io/docs/expo-devtools)** · [Quick start](https://axonpack.github.io/docs/expo-devtools/quick-start) · [Reference](https://axonpack.github.io/docs/expo-devtools/reference) · [Upgrading](https://axonpack.github.io/docs/expo-devtools/upgrading) · [Changelog](https://axonpack.github.io/docs/expo-devtools/changelog)

[![npm version](https://img.shields.io/npm/v/@axonpack/expo-devtools.svg)](https://www.npmjs.com/package/@axonpack/expo-devtools)
[![npm downloads](https://img.shields.io/npm/dm/@axonpack/expo-devtools.svg)](https://www.npmjs.com/package/@axonpack/expo-devtools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/axonpack/axonpack/blob/main/LICENSE)

<table>
  <tr>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/network-log.png" width="260" alt="Network tab listing captured requests" /></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/console-log.png" width="260" alt="Console tab listing captured logs" /></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/perf-statistics.png" width="260" alt="Performance tab showing frame rate and memory charts" /></td>
  </tr>
  <tr>
    <td>Every request as it happens, in-app browser traffic included.</td>
    <td>Every log, with objects you can open up and explore.</td>
    <td>Frame rate, memory and startup, measured on the device.</td>
  </tr>
</table>

</div>

## Installation

```sh
npx expo install @axonpack/expo-devtools react-native-safe-area-context react-native-webview expo-clipboard
```

Those three are peer dependencies, so each resolves to the version your Expo SDK ships.

## Setup

Wrap your app once, at the root. That is the whole setup: no config plugin, no `app.json` changes, no
native code to write.

```tsx
import { DevtoolsProvider } from '@axonpack/expo-devtools';

export default function App() {
  return (
    <DevtoolsProvider config={{ enabled: __DEV__ }}>
      <YourApp />
    </DevtoolsProvider>
  );
}
```

`enabled` is the only gate. With it off nothing is patched, nothing is recorded and no button is
drawn, so the mount is safe to leave in a release build.

Two things need a little more than that: an in-app browser takes the `useDevtoolsWebView` hook, and
the Storage tab shows nothing until you register your stores in `config.storage.adapters`, because
this package depends on no storage library and cannot discover one.

## Documentation

Everything else is on the docs site.

| Page                                                                                 | What is on it                                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [Quick start](https://axonpack.github.io/docs/expo-devtools/quick-start)             | Setup for Expo Router or your own entry point, and the launcher button |
| [Guides](https://axonpack.github.io/docs/expo-devtools)                              | One page per tab, each ending in what it cannot measure and why        |
| [In-app browsers](https://axonpack.github.io/docs/expo-devtools/in-app-browsers)     | Capturing a `<WebView />`'s requests and logs                          |
| [Leaving it in production](https://axonpack.github.io/docs/expo-devtools/production) | What `enabled: false` does, and the two things that still run          |
| [Reference](https://axonpack.github.io/docs/expo-devtools/reference)                 | Every control, every config option, every exported type                |
| [Upgrading](https://axonpack.github.io/docs/expo-devtools/upgrading)                 | What moved where in 3.0, coming from 2.x                               |
| [Changelog](https://axonpack.github.io/docs/expo-devtools/changelog)                 | Every published release, also in [`CHANGELOG.md`](./CHANGELOG.md)      |

The same reference ships inside this package as [`REFERENCE.md`](./REFERENCE.md), for reading offline.

## Example app

`example/` is a runnable Expo app with one screen per tab, each a wall of buttons that produces real
traffic, logs, stalls and crashes to look at. It doubles as a worked configuration: a custom theme, a
REPL context, and all four storage adapters against real AsyncStorage, MMKV, SecureStore and an
in-memory `Map`.

```sh
cd example
bun run start   # Expo Go / dev client
bun run ios     # or: bun run android (full native build)
```

## What's built, and what isn't

See [the feature list](https://github.com/axonpack/axonpack/blob/main/packages/@axonpack/expo-devtools/notes/README.md) for what's built, what the platform genuinely can't do (and why this
doesn't fake it), and what's still on the table.
