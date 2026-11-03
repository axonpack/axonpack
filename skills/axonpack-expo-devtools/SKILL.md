---
name: axonpack-expo-devtools
description: Set up @axonpack/expo-devtools in a React Native or Expo app and prove it works, then debug the running app from the terminal with `npx devtools`. Use when the project depends on @axonpack/expo-devtools, when the user wants in-app devtools, or when you need to see what the running app did instead of guessing, such as failed or slow requests with their headers and bodies, console errors, crashes and their breadcrumbs, stored values, the TanStack Query cache, Redux actions, navigation or performance. Also for DevtoolsProvider, storage adapters, redaction, the Redux enhancer, WebView capture and the React Native DevTools tab.
---

# @axonpack/expo-devtools

Devtools that run inside the app, as ten tabs on the device: Network, Console, Performance, Storage,
Query, Navigation, Redux, Crashes, AI Usage and Debug. The package ships a command line tool,
`devtools`, that reads what those tabs recorded in the running app and prints plain text. When
something in the app is wrong, read it with `devtools` before you guess.

## Set it up

Do the steps in order. Each ends with a check; don't go on until it passes.

1. **Find the package manager.** Look for a lockfile in the app's folder, or the nearest parent
   folder that has one. Use that manager for everything and never add a second lockfile.

   | Lockfile                | Manager | Runner (`<x>` below) |
   | ----------------------- | ------- | -------------------- |
   | `package-lock.json`     | npm     | `npx`                |
   | `yarn.lock`             | yarn    | `yarn`               |
   | `pnpm-lock.yaml`        | pnpm    | `pnpm exec`          |
   | `bun.lock`, `bun.lockb` | bun     | `bunx`               |

   No lockfile at all: ask the user which one they use.

2. **Check the versions** in `package.json`.
   - Built and tested on Expo SDK 57 and 58 (React Native 0.86 and 0.88). The peer ranges are `*`,
     so an installer won't warn outside them. An older SDK may work, but tell the user it is
     untested.
   - `react` must be 19.2 or newer: the package depends on `@axonpack/react-native-devtools-tab`,
     which needs it. The install only warns about it (`ERESOLVE overriding peer dependency` with
     npm), so check it here. Older: ask the user before upgrading the Expo SDK.
   - The CLI needs Node 22 or newer (`node -v`).
   - On an iOS 27 simulator or device, the app needs Expo SDK 58 or newer.

3. **Install** the package and its three peers:

   ```sh
   <x> expo install @axonpack/expo-devtools react-native-safe-area-context react-native-webview expo-clipboard
   ```

   `expo install` uses the project's own package manager and picks the peer versions for its SDK.
   Check: `<x> devtools --help` prints the tool's help.

4. **Mount the provider once, at the root.** With Expo Router (`expo-router` is a dependency and
   `main` is `expo-router/entry`), the root is `src/app/_layout.tsx` or `app/_layout.tsx`. Otherwise
   it is the component `main` registers, usually `App`. Wrap everything that component returns:

   ```tsx
   // src/app/_layout.tsx, app/_layout.tsx or App.tsx
   import { DevtoolsProvider } from "@axonpack/expo-devtools";

   export default function RootLayout() {
     return (
       <DevtoolsProvider config={{ enabled: __DEV__ }}>
         {/* what this component returned before, unchanged */}
       </DevtoolsProvider>
     );
   }
   ```

   With React Navigation and no Expo Router, put the provider inside `NavigationContainer`, or see
   [references/config.md](references/config.md). `enabled` is the only gate: off, nothing is patched
   or drawn, so the mount can stay in a release build.
   Check: `<x> tsc --noEmit` passes.

5. **Wrap the Metro config.** It adds the tabs to React Native DevTools, and the CLI needs it on
   React Native below 0.86. With no `metro.config.js`, create Expo's default with
   `<x> expo customize metro.config.js`. Then wrap what it exports:

   ```js
   // metro.config.js
   const { getDefaultConfig } = require("expo/metro-config");
   const { withDevtools } = require("@axonpack/expo-devtools/metro");

   const config = getDefaultConfig(__dirname);
   module.exports = withDevtools(config);
   ```

   If the file already wraps the config in something else, put `withDevtools(...)` around the
   outermost call. Check:
   `node -e "console.log(typeof require('./metro.config.js').server.enhanceMiddleware)"` prints
   `function`, with no `[devtools] ... was not found` warning. Restart Metro if it is running.

6. **Native build: none needed.** No config plugin, no `app.json` change, and it runs in Expo Go. A
   development build adds a few readings (main-thread frame rate, memory, native crashes, request
   timing phases). If the app has `ios/` and `android/` folders already, rebuild it
   (`<x> expo run:ios`) to link the optional native module. After moving to SDK 58 for iOS 27,
   regenerate the iOS project with `<x> expo prebuild --clean -p ios`: a stale `ios/` folder
   crashes at launch.

7. **Verify.** Without a device:
   - `<x> expo config --type public` prints the config with no error.
   - `<x> tsc --noEmit` passes.
   - `<x> expo export --platform ios --output-dir <scratch folder>` bundles. Delete the folder after.

   With the app running (ask the user to start `<x> expo start` and open the app in a simulator, a
   phone or Expo Go):
   - `<x> devtools apps` lists the app with a version in the `devtools` column.
   - `<x> devtools topics` lists the topics, with `network` and `console` not `off`.
   - The app shows a draggable bug button that opens the panel.

## Setup problems

- **`ERESOLVE overriding peer dependency` on `react`.** React is below 19.2. See step 2.
- **`-` in the `devtools` column of `devtools apps`.** The provider isn't mounted, `enabled` is
  false, or it is a release build. Only a development bundle answers. `?` there means React Native
  below 0.86 without step 5.
- **`no app found on Metro ports 8081 to 8090`.** Metro isn't running, or runs on another port
  (`--port <n>`).
- **`npx devtools` fetches an unrelated package.** It happens from a monorepo root and with bun. Use
  `npx @axonpack/expo-devtools <command>`, or `bunx devtools`.
- **Two bug buttons.** The provider is mounted twice. Keep only the root one.
- **A config change does nothing.** The config is read on the first render. Reload the app.
- **No tab in React Native DevTools.** Metro wasn't restarted after step 5.
- **The console prompt in a release build.** `console.repl` defaults to `true` wherever the devtools
  are on, and runs what is typed. Ship with `enabled: false`, or set `console: { repl: false }`.

## Read the running app

Run it from the app's folder: `<x> devtools <command>`. Pass the topic and each flag as separate
arguments, and quote every `--where` clause.

```sh
devtools apps                                       # app, device, devtools version, Metro port
devtools topics                                     # what you can query, with row counts
devtools network --where state=error --since 10m    # failed: 4xx/5xx, no answer, failed sockets
devtools console --where 'level=error,warn' --limit 20
devtools get network <id>                           # one request: headers, bodies, timing
devtools crash                                      # then: devtools get crash <id> --full
devtools network override <url> --status 500 --body '{"error":"down"}'  # mock that exact URL
devtools network send GET <url>                     # a request from the app, logged like any other
```

- More than one app running: add `--app <slug>` or `--device <name>` to every command.
- The reply is tab-separated with a header row. Rerun a list with the `# next: --after <id>` line it
  printed to get only new rows. `# <topic> is off` means that tab isn't set up.
- Storage, Query and Redux are `off` until the app sets them up: see
  [references/config.md](references/config.md). Performance has rows only while its tab records,
  and it starts paused, so ask the user to press record.
- Replies come after the app's redaction. The `authorization`, `cookie` and `set-cookie` headers
  are always masked. Every query and action, with its reply, shows in the app's AI Usage tab.
- Network actions change the app: `override`, `block`, `unoverride <url> | --all`, `overrides`,
  `send`, `replay <id>`. Overrides match the exact URL. Anything but GET, HEAD and OPTIONS needs
  `--yes`: ask the user first. Remove your overrides when done (`devtools network unoverride --all`).

Every topic and field, every flag and action, the exit codes, recipes and each error message:
[references/cli.md](references/cli.md).

## Docs

- Quick start: https://axonpack.dev/docs/expo-devtools/quick-start
- Use with AI agents: https://axonpack.dev/docs/expo-devtools/ai-agents
- Provider and every config option: https://axonpack.dev/docs/expo-devtools/reference/provider
- Compatibility: https://axonpack.dev/docs/expo-devtools/compatibility
- Leaving it in production: https://axonpack.dev/docs/expo-devtools/production
