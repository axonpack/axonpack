---
name: axonpack-react-native-devtools-tab
description: Set up @axonpack/react-native-devtools-tab in a React Native or Expo app and prove it works, to add a custom tab to React Native DevTools drawn from a React component that runs in the app and reads the app's own state directly. Use when the project depends on @axonpack/react-native-devtools-tab, or when the user wants their own panel, inspector or debug controls in React Native DevTools (the debugger `j` opens in Metro), or to show a store or call app functions from DevTools.
---

# @axonpack/react-native-devtools-tab

Puts a tab of your own in React Native DevTools. The tab's component runs in the app, so it imports
the app's stores and calls the app's functions directly. There is no bridge to write and no state to
copy, and no native code.

## Set it up

Do the steps in order. Each ends with a check; don't go on until it passes.

1. **Find the package manager.** Look for a lockfile in the app's folder, or the nearest parent
   folder that has one. Use that manager for everything and never add a second lockfile.

   | Lockfile                | Manager | Runner (`<x>` below) | Add (no Expo) |
   | ----------------------- | ------- | -------------------- | ------------- |
   | `package-lock.json`     | npm     | `npx`                | `npm install` |
   | `yarn.lock`             | yarn    | `yarn`               | `yarn add`    |
   | `pnpm-lock.yaml`        | pnpm    | `pnpm exec`          | `pnpm add`    |
   | `bun.lock`, `bun.lockb` | bun     | `bunx`               | `bun add`     |

   No lockfile at all: ask the user which one they use.

2. **Check the versions.** `react` 19.2 or newer in `package.json` (the one peer; an install with
   an older React only warns, so check it here), Node 20 or newer, and a React Native whose
   debugger is React Native DevTools. Built and tested on Expo SDK 57 and 58. On an iOS 27 simulator or device,
   the app needs Expo SDK 58 or newer. Ask the user before upgrading anything.

3. **Install** it as a regular dependency, since Metro reads the config for release builds too:
   `<x> expo install @axonpack/react-native-devtools-tab` in an Expo app, or the "Add" command
   without Expo.
   Check: it is under `dependencies`, not `devDependencies`, in `package.json`.

4. **Wrap the Metro config.** With no `metro.config.js`, create Expo's default with
   `<x> expo customize metro.config.js`. Then wrap what it exports, around any wrapper already
   there:

   ```js
   // metro.config.js
   const { getDefaultConfig } = require("expo/metro-config");
   const {
     withReactNativeDevtoolsTab,
   } = require("@axonpack/react-native-devtools-tab/metro");

   module.exports = withReactNativeDevtoolsTab(getDefaultConfig(__dirname));
   ```

   A bare React Native app wraps its own config from `@react-native/metro-config` the same way. If
   the app has `@axonpack/expo-devtools` with `withDevtools`, that is the same wrap: use one, not
   both.
   Check:
   `node -e "console.log(typeof require('./metro.config.js').server.enhanceMiddleware)"` prints
   `function`, with no `[devtools] React Native DevTools was not found` warning.

5. **Write the tab and load it in development.** One file registers it:

   ```tsx
   // devtools.tsx, next to package.json
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
     icon: "⚛",
     component: Session,
   });
   ```

   Then require it behind `__DEV__` at the top of the root: `if (__DEV__) require("./devtools");`
   in `App.tsx`, `require("../devtools")` from `app/_layout.tsx`, `require("../../devtools")` from
   `src/app/_layout.tsx`. Use `require`, not `import`: an `import` is hoisted and ships the tab in
   a release bundle.
   Check: `<x> tsc --noEmit` passes.

6. **Native build: none needed.** Restart Metro (`<x> expo start`), since a running server doesn't
   pick up a config change. Expo Go and development builds both work.

7. **Verify.** Without a device: the check in step 4, `<x> tsc --noEmit`, and
   `<x> expo export --platform ios --output-dir <scratch folder>` bundles (delete the folder after).
   With Metro running, `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8081/axonpack-rn-devtools-tab/host.js`
   prints `200`. Then ask the user to open the app, press `j` in Metro, and look for the tab beside
   Console and Sources.

## Setup problems

- **No tab and nothing printed.** Metro wasn't restarted after step 4.
- **`[devtools] React Native DevTools was not found`.** Pass the folder that
  `node -p "require('@react-native/debugger-frontend')"` prints, run in the app's folder, as
  `withReactNativeDevtoolsTab(config, { frontendPath })`.
- **`could not point the debugger shortcut at the tab`.** Two copies of
  `@react-native/dev-middleware`. Dedupe them.
- **`the app never installed its devtools dispatcher`** (in the DevTools console). The bundle never
  loaded the file that calls `registerTab`. Check the `require` in step 5.
- **`metro.config.js` guarded by `__DEV__`.** It runs in Node, where `__DEV__` doesn't exist.

## Writing tabs

- `ReactNativeDevtoolsPanel.registerTab({ name, component, icon? })` registers one tab and returns
  it. Call it once per tab. `tab.focus()` shows it in an open DevTools window.
- The JSX can be DOM (`div`, `button`, `input`) or React Native (`View`, `Text`, `Pressable`,
  `ScrollView`, `Image`). Hooks, effects and any state library work.
- Each tab is its own React root, so the app's providers are not above it. Import a store module
  instead of reading React context.
- `COPY_ATTRIBUTE` on an element copies its value to the computer's clipboard on click:
  `<button {...{ [COPY_ATTRIBUTE]: curl }}>Copy as cURL</button>`. A click handler runs in the app
  and would copy to the phone.
- A `TextInput` takes `defaultValue` with `onChangeText`, not `value`. A `ref` gets a stand-in, so
  canvas, measuring and DOM libraries don't work. `SafeAreaView` has no insets and a natively
  driven `Animated` sits still.
- A script on the computer can call a method on `globalThis.__AXONPACK_AGENT__` in the app by
  posting to Metro at `/axonpack-rn-devtools-tab/agent`. See the reference for the request shape.

## Docs

- Quick start: https://axonpack.dev/docs/react-native-devtools-tab/quick-start
- App state: https://axonpack.dev/docs/react-native-devtools-tab/app-state
- Components: https://axonpack.dev/docs/react-native-devtools-tab/components
- Troubleshooting: https://axonpack.dev/docs/react-native-devtools-tab/troubleshooting
- In a release build: https://axonpack.dev/docs/react-native-devtools-tab/production
- Reference: https://axonpack.dev/docs/react-native-devtools-tab/reference
