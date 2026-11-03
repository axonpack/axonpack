---
name: axonpack
description: Pick and set up the right Axonpack (@axonpack/*) packages in a React Native, Expo or React app, in the right order when there are several. Use when a project depends on any @axonpack/* package, when the user mentions Axonpack, or when they want devtools inside the app that an AI agent can read from a terminal, their own tab in React Native DevTools, JSON or XML trees and syntax highlighting, an app store update prompt, or per-branch JS previews for QA. Covers what each package does, the package manager, the order of setup, native rebuilds and where the docs live.
---

# Axonpack

Axonpack is a set of free, MIT-licensed libraries for React Native and Expo. Each package is
published, versioned and documented on its own, and there is no `axonpack` meta-package to install.
Each package has its own skill with a step-by-step setup and a check for each step. Follow it.

## Which package

| Package                               | Use it for                                                                                                                                                           | Skill                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `@axonpack/expo-devtools`             | Devtools inside the app: network, console, performance, storage, TanStack Query, navigation, Redux and crashes. An agent reads them from a terminal with `devtools`. | `axonpack-expo-devtools`             |
| `@axonpack/react-native-devtools-tab` | A tab of your own in React Native DevTools, drawn from a React component that runs in the app.                                                                       | `axonpack-react-native-devtools-tab` |
| `@axonpack/react-pretty-print`        | Collapsible JSON and XML trees and a syntax highlighter for 38 languages, one implementation for React and React Native.                                             | `axonpack-react-pretty-print`        |
| `@axonpack/in-app-updates`            | Check the App Store or Play Store for a newer version and show an update prompt, soft or forced.                                                                     | `axonpack-in-app-updates`            |
| `@axonpack/preview`                   | Publish a JS bundle per branch to an S3-compatible bucket, and let QA switch to it in the installed app with no native rebuild.                                      | `axonpack-preview`                   |

If a package's skill isn't installed, add it with this one:
`npx skills add axonpack/axonpack --skill axonpack axonpack-<package>` (`yarn dlx`, `pnpm dlx` or
`bunx` in place of `npx`).

## Package manager

Use the one whose lockfile is in the app's folder, or the nearest parent folder that has one. Never
switch, and never add a second lockfile. No lockfile: ask the user.

| Lockfile                | Manager | Run a tool (`<x>`) | Add a package (no Expo) |
| ----------------------- | ------- | ------------------ | ----------------------- |
| `package-lock.json`     | npm     | `npx`              | `npm install`           |
| `yarn.lock`             | yarn    | `yarn`             | `yarn add`              |
| `pnpm-lock.yaml`        | pnpm    | `pnpm exec`        | `pnpm add`              |
| `bun.lock`, `bun.lockb` | bun     | `bunx`             | `bun add`               |

In an Expo app, install with `<x> expo install <packages>`: it uses that manager and picks the
versions that match the SDK. In a bun project run tools with `bunx`; `npx` can't read bun's install
and goes to npm for a package of that name instead.

## Several packages in one app

1. **Check the versions once**, against the strictest package you are adding. `expo-devtools` and
   `react-native-devtools-tab` need React 19.2 or newer. `preview` needs Expo SDK 53 or newer with
   the New Architecture and Hermes. An iOS 27 simulator or device needs Expo SDK 58 or newer. Ask
   the user before upgrading anything.
2. **Install in one command**, with each package's peers. For all five:

   ```sh
   <x> expo install @axonpack/expo-devtools react-native-safe-area-context react-native-webview expo-clipboard @axonpack/react-native-devtools-tab @axonpack/react-pretty-print @axonpack/in-app-updates expo-application expo-localization @axonpack/preview expo-file-system
   ```

3. **Wire the JS packages**, one skill at a time, each to its typecheck: `react-pretty-print`,
   `expo-devtools`, `react-native-devtools-tab`, `in-app-updates`.
   - **One Metro wrap.** `withDevtools` from `@axonpack/expo-devtools/metro` is the same wrap as
     `withReactNativeDevtoolsTab`, and serves your own tabs too. Use one of them, not both.
   - **One root.** Nest the providers in the root component (`src/app/_layout.tsx`,
     `app/_layout.tsx` or `App.tsx`), each mounted once:

     ```tsx
     <PreviewProvider config={previewConfig}>
       <DevtoolsProvider config={{ enabled: __DEV__ }}>
         {/* the app, unchanged */}
         <UpdatePrompt />
       </DevtoolsProvider>
     </PreviewProvider>
     ```

4. **Add `preview` last.** Its config plugin needs a native build, and that one build also links
   the optional native modules of `expo-devtools` and `in-app-updates`.
5. **Verify each package** with the verify step in its skill: the checks that need no device first,
   then, with the app running, the live ones.

## Native code and rebuilds

| Package                     | Native code                                     | What a change needs                                                                                   |
| --------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `expo-devtools`             | One optional module. Runs in Expo Go            | No rebuild. A development build adds a few readings. A `metro.config.js` change needs a Metro restart |
| `react-native-devtools-tab` | None                                            | A `metro.config.js` line, then a Metro restart                                                        |
| `react-pretty-print`        | None. Runs in Expo Go and on the web            | Nothing                                                                                               |
| `in-app-updates`            | Optional Android module for Play in-app updates | The checks run in Expo Go. The Play module needs a development build                                  |
| `preview`                   | Yes, plus a config plugin. Not in Expo Go       | The plugin in the app config, then `<x> expo prebuild` and a new native build                         |

A config plugin or a new native module only takes effect in a new native build (`<x> expo run:ios`,
`<x> expo run:android`, or EAS Build). Reloading the JS is not enough. After moving to SDK 58 for
iOS 27, regenerate the iOS project with `<x> expo prebuild --clean -p ios`: a stale `ios/` folder
crashes at launch.

## Docs

- Site: https://axonpack.dev/docs, one section per package at `https://axonpack.dev/docs/<package>`
  (`expo-devtools`, `react-native-devtools-tab`, `react-pretty-print`, `in-app-updates`,
  `preview`).
- For agents: https://axonpack.dev/llms.txt lists every page, and https://axonpack.dev/llms-full.txt
  has them all in one file.
- Source and issues: https://github.com/axonpack/axonpack.
