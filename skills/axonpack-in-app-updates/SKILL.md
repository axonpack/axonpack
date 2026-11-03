---
name: axonpack-in-app-updates
description: Set up @axonpack/in-app-updates in a React Native or Expo app and prove it works, to check the App Store or Play Store for a newer version and show an update prompt. Use when the project depends on @axonpack/in-app-updates, or when the user wants a "new version available" modal, a forced or minimum-version update, skip this version, a store version check, a custom update screen, Google Play in-app updates, or to fake a release to test the prompt.
---

# @axonpack/in-app-updates

One component, `<UpdatePrompt />`, checks the store for a newer version and opens a ready-made
update modal: soft or forced, with skip, light and dark mode and your own theme. The checks are
plain JavaScript and run in Expo Go.

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

2. **Check the versions** in `package.json`: `react` 18 or newer, `react-native` 0.72 or newer. For
   the optional Google Play module, `expo` 52 or newer (built and tested on SDK 58). On an iOS 27
   simulator or device, the app needs Expo SDK 58 or newer. Below these, tell the user and stop.

3. **Install.** In an Expo app, with the two optional peers:

   ```sh
   <x> expo install @axonpack/in-app-updates expo-application expo-localization
   ```

   `expo-application` reads the installed version and bundle id; `expo-localization` picks the App
   Store country. Without Expo, add the package alone and call `setVersionInfo` once at the top of
   the entry file:

   ```ts
   import { setVersionInfo } from "@axonpack/in-app-updates";

   setVersionInfo({
     getCountry: () => "US",
     getPackageName: () => "com.example.app",
     getCurrentBuildNumber: () => 42,
     getCurrentVersion: () => "1.4.0",
   });
   ```

   Check: `package.json` lists what you installed.

4. **Mount the prompt once, at the root.** No config plugin, no `app.json` or Metro change. Put
   `<UpdatePrompt />` beside the app's screens in the root component: `src/app/_layout.tsx` or
   `app/_layout.tsx` with Expo Router, otherwise the component `main` registers, usually `App`.

   ```tsx
   import { UpdatePrompt } from "@axonpack/in-app-updates";

   export default function RootLayout() {
     return (
       <>
         {/* what this component returned before, unchanged */}
         <UpdatePrompt />
       </>
     );
   }
   ```

   If the app has AsyncStorage, pass `skipStorage={AsyncStorage}` so a skip survives a restart.
   Ask the user whether updates should be forced (`required`, `minimumVersion`).
   Check: `<x> tsc --noEmit` passes.

5. **Native build: none needed.** It runs in Expo Go. Only `nativeUpdate` (Google Play's own update
   screen on Android) needs a development build, and Play answers only for an app installed from
   Play. After moving to SDK 58 for iOS 27, regenerate the iOS project with
   `<x> expo prebuild --clean -p ios`: a stale `ios/` folder crashes at launch.

6. **Verify.** Without a device: `<x> tsc --noEmit` passes and
   `<x> expo export --platform ios --output-dir <scratch folder>` bundles (delete the folder after).
   On a device, fake a release for one run:
   `<UpdatePrompt mock={{ latestVersion: "9.0.0", releaseNotes: "Test" }} />`. Ask the user to start
   the app: the update modal opens with 9.0.0. Then remove the `mock` prop. A mock is ignored
   outside `__DEV__`, so it can't reach a release build.

## Setup problems

- **`VersionInfoUnavailableError`.** No `expo-application` and no `setVersionInfo`. Step 3.
- **The prompt never shows and nothing says why.** Errors are hidden by default. Run
  `needUpdate({ ignoreErrors: false })` and read the error. A `NotFoundError` usually means a debug
  bundle id (such as `com.example.dev`) that isn't published in that country: test with a mock.
- **A skip comes back after a restart.** No `skipStorage`.
- **The prompt stays light on a dark phone.** `"userInterfaceStyle": "light"` in `app.json`. Set
  `"automatic"`, or pass `theme={{ mode: 'dark' }}`.
- **The App Store still shows the old version.** It caches for a few hours after a release.
- **Reading the Play page fails** (`ParseError`). Play has no official version API and a "Varies with
  device" listing can't be read. Add a backup:
  `chain(playStore, jsonProvider({ url: 'https://example.com/version.json' }))`.
- **A new build number with the same version name isn't offered.** The stores report the version
  name. Give every release a new version string.

## Use it

```tsx
// Your own screen or banner
import { useVersionCheck } from "@axonpack/in-app-updates";

const { isNeeded, isForced, latestVersion, openStore, skipVersion } =
  useVersionCheck();
```

```ts
// One answer in plain code
import { needUpdate } from "@axonpack/in-app-updates";

const result = await needUpdate(); // { isNeeded, isForced, updateType, latestVersion, storeUrl, ... }
```

| Option           | What it does                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `required`       | Force the update: `true`, `'major'`, `'minor'`, `'patch'`, or `(result) => boolean`         |
| `minimumVersion` | Versions below it are forced                                                                |
| `canSkip`        | `false` removes skip for soft updates                                                       |
| `provider`       | `'appStore'`, `'playStore'`, `jsonProvider({ url })`, or `chain(a, b)` to try each in order |
| `depth`          | Compare only this many version parts                                                        |
| `ignoreErrors`   | Default `true`: warn and resolve `undefined`. `false` throws a typed error                  |

`<UpdatePrompt />` also takes `theme`, `labels`, `icon`, `notesExpanded`, `component` (your own
modal), `onUpdate`, `nativeUpdate` and `skipStorage`. The hook also takes `enabled` and
`refreshOnForeground`. `setMockVersion({ latestVersion })` fakes a release for every check in
`__DEV__`.

## Docs

- Quick start: https://axonpack.dev/docs/in-app-updates/quick-start
- Force and skip: https://axonpack.dev/docs/in-app-updates/force-updates
- Providers: https://axonpack.dev/docs/in-app-updates/providers
- Your own modal: https://axonpack.dev/docs/in-app-updates/custom-modal
- Play in-app updates: https://axonpack.dev/docs/in-app-updates/play-in-app-updates
- Testing: https://axonpack.dev/docs/in-app-updates/testing
- Troubleshooting: https://axonpack.dev/docs/in-app-updates/troubleshooting
- Reference: https://axonpack.dev/docs/in-app-updates/reference
