# @axonpack/in-app-updates

Find out whether the store has a newer build of your app, and ask the user to update. It does
force updates, soft updates, a ready-made modal, your own modal, a hook, and dev-build mocking.

Everything works in plain JavaScript and runs in Expo Go. The one exception is Google Play's
in-app update (see below), a small Android-only Expo module that is skipped quietly when it is not
linked. There is no iOS native code, so `pod install` is unchanged. It works with Expo SDK 58, React Native 0.88 (New Architecture) and React 19.

## Install

```sh
npm install @axonpack/in-app-updates
# or: bun add @axonpack/in-app-updates
```

Where the app's own version comes from is an optional peer. Install `expo-application`, or call
`setVersionInfo({...})` with your own values.

`expo-localization` is optional too, and only used to pick the App Store country. Nothing is
imported at load time, so a missing peer never breaks your bundle.

## Functions

`getCountry`, `getPackageName`, `getCurrentBuildNumber`, `getCurrentVersion`, `getStoreUrl`,
`getAppStoreUrl`, `getPlayStoreUrl`, `getLatestVersion` and `needUpdate`, on the default export and
as named exports. They take `provider`, `depth`, `ignoreErrors`, `forceUpdate`, `currentVersion`,
`latestVersion`, `country` and `packageName` options.

By default errors are logged and the call resolves `undefined`. Pass `ignoreErrors: false` to get a
thrown, typed error instead (and a return type without `undefined`).

- **Country** comes from `getLocales()[0].regionCode`, then older locale fields, then `Intl`, then `us`.
- **`getStoreUrl` on iOS** needs no `appID`; it is looked up from the bundle id.
- **The App Store lookup** tries the device country, then `fallbackCountry` (default `us`).
- **Network**: a 10 second timeout, one retry, and `AbortSignal` support. Results are cached for 5 minutes, and `forceUpdate: true` skips the cache.
- **A `provider` function** returns a version string or a full result.

## Usage

```ts
import VersionCheck from "@axonpack/in-app-updates";

const r = await VersionCheck.needUpdate();
if (r?.isForced) blockTheApp();
else if (r?.isNeeded) suggest(r.storeUrl, r.releaseNotes);
```

### The hook

```tsx
import { useVersionCheck } from "@axonpack/in-app-updates";

const {
  isLoading,
  error,
  isNeeded,
  isForced,
  latestVersion,
  releaseNotes,
  openStore,
  skipVersion,
  refresh,
} = useVersionCheck({ minimumVersion: "2.0.0" });
```

It checks on mount and again every time the app returns to the foreground
(`refreshOnForeground: false` turns that off, `enabled: false` pauses it). A newer check always
wins over an older one that is still in flight.

### The modal

`UpdatePrompt` runs the check and shows a modal when an update is needed. The default modal has
an icon badge, the installed and latest versions, a collapsible "What's new" row with the release notes when the store has them, a full
width **Update** button, and **Later** and **Skip this version** underneath. A forced update has
only **Update**, in the danger colour, and the Android back button does nothing. While the store
is opening, the button shows a spinner.

```tsx
import { UpdatePrompt } from "@axonpack/in-app-updates";

<UpdatePrompt
  required="major"
  theme={{
    primary: "#16a34a",
    radius: 16,
    fonts: { regular: "Inter-Regular", bold: "Inter-Bold" },
  }}
  labels={{ update: "Mettre à jour", later: "Plus tard" }}
/>;
```

**Theme.** Every colour, the corner radius, the card width and the fonts are tokens. Pass any of
them as a partial `theme`. The modal follows the device appearance, and `mode: "light" | "dark"`
pins it. Your app's own `userInterfaceStyle` decides what the device appearance is.

| Token                                   | What it colours                                                            |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `backdrop`, `card`                      | The dimmed screen and the card                                             |
| `surface`, `border`                     | The version row, and the release notes box                                 |
| `title`, `text`, `muted`                | Headings, body text, and quiet text (labels and **Skip this version**)     |
| `primary`, `primaryText`, `primarySoft` | The Update button and **Later**, the text on it, the icon badge            |
| `danger`, `dangerSoft`                  | The same, for a forced update                                              |
| `radius`, `maxWidth`                    | Card corners (buttons and boxes scale from it) and width. 20 and 340       |
| `fonts`                                 | `{ regular, medium, bold }` family names. Missing ones use the system font |

`LIGHT_THEME`, `DARK_THEME` and `resolveTheme` are exported if you want to start from the defaults.
`labels` takes `title`, `forcedTitle`, `message`, `forcedMessage`, `installed`, `latest`,
`releaseNotes`, `update`, `later` and `skip`. `icon` replaces the badge content with any element.

**Your own modal.** Pass `component`. It receives everything below and renders anything, so an app
can reuse its own Button, Text and theme hook:

```tsx
import { UpdatePrompt, type UpdateModalProps } from "@axonpack/in-app-updates";
import { Modal, View } from "react-native";

import { Button } from "@/components/button";
import { Text } from "@/components/text";
import { useTheme } from "@/theme";

const AppUpdateModal = ({
  visible,
  isForced,
  isUpdating,
  canSkip,
  currentVersion,
  latestVersion,
  releaseNotes,
  onUpdate,
  onDismiss,
  onSkip,
}: UpdateModalProps) => {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isForced ? undefined : onDismiss}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{
            borderRadius: 20,
            padding: 24,
            backgroundColor: colors.backgroundSecondary,
          }}
        >
          <Text variant="heading">
            {isForced ? "Update required" : "Update available"}
          </Text>
          <Text variant="body">
            {currentVersion} to {latestVersion}
          </Text>
          {releaseNotes ? <Text variant="body">{releaseNotes}</Text> : null}
          <Button fullWidth isLoading={isUpdating} onPress={onUpdate}>
            Update
          </Button>
          {!isForced && (
            <Button variant="ghost" onPress={onDismiss}>
              Later
            </Button>
          )}
          {canSkip && (
            <Button variant="ghost" onPress={onSkip}>
              Skip this version
            </Button>
          )}
        </View>
      </View>
    </Modal>
  );
};

<UpdatePrompt component={AppUpdateModal} />;
```

The props are `visible`, `isForced`, `isUpdating`, `canSkip`, `currentVersion`, `latestVersion`,
`minimumVersion`, `updateType`, `releaseNotes`, `storeUrl`, `onUpdate`, `onDismiss`, `onSkip`, plus
the `theme`, `labels` and `icon` you gave `UpdatePrompt`. `onUpdate` opens the store. Pass `onUpdate`
to `UpdatePrompt` to do something else, such as show your own error when there is no store URL.
`isUpdating` is true from the press until that finishes.

### Force update and soft update

- `minimumVersion` (option, or reported by the provider): a build below it gets `isForced: true`,
  and `isNeeded` is `true` whatever else is set.
- `required`: make updates mandatory without a minimum version. `true` forces every update,
  `"major"`, `"minor"` or `"patch"` forces that size of update or bigger, and a function decides per
  result. A provider can also report `required: true`. A forced update cannot be dismissed or skipped.
- `canSkip`: `false` removes **Skip this version** from soft updates. Default `true`.
- `skipVersion`: a soft update to exactly that version comes back `isNeeded: false`,
  `isSkipped: true`. It never mutes a forced update. The hook's `skipVersion()` stores this for
  you; give `skipStorage` (AsyncStorage, MMKV or `localStorage`-shaped) to keep it across launches.
- Version formats: `1`, `1.2`, `1.2.3.4`, calendar versions like `2024.10.1`, and plain dates like
  `2024-10-12` all order correctly. So do release tags: `1.2.3-beta.2`, `1.2.3-rc1`, `1.2.3beta`,
  `1.2.3-canary.5+sha`, and a leading label as in `canary-1.2.3`. A tag sorts below its release, and
  known stages sort in shipping order: dev, nightly, canary, alpha, beta, preview, rc. A version with
  no number (`canary`) or odd text (`2.0 (build 5)`) is rejected with `InvalidVersionError`, so
  pass `compare` (like `Array.sort`'s) and it is used for every check.
- `updateType` is `major`, `minor`, `patch`, `prerelease`, `build` or `none`, so you can nag on a
  major and stay quiet on a patch.

### Providers

```ts
import {
  chain,
  jsonProvider,
  appStore,
  playStore,
} from "@axonpack/in-app-updates";

await VersionCheck.needUpdate({
  provider: chain(
    playStore,
    jsonProvider({ url: "https://example.com/version.json" }), // when Play's page cannot be read
  ),
});
```

| Provider                                  | Reads                | Gives                                                                                             |
| ----------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| `'appStore'` (iOS default)                | iTunes lookup        | version, store url, release notes, release date                                                   |
| `'playStore'` (Android default)           | the public Play page | version, store url                                                                                |
| `jsonProvider({ url, parse?, headers? })` | your endpoint        | anything you return: `latestVersion`, `minimumVersion`, `storeUrl`, `releaseNotes`, `buildNumber` |
| `chain(a, b, ...)`                        | each in order        | the first that works                                                                              |
| a function or `{ getVersion }`            | whatever you write   | the same                                                                                          |

The default JSON shape is `{ "latestVersion": "2.1.0", "minimumVersion": "2.0.0", "storeUrl": "...", "releaseNotes": "..." }`,
or the same under an `ios` / `android` key. For anything else (a remote config service's REST
output, say) pass `parse`.

Play Store has no API for this, so its page is scraped with three patterns tried in order. If
Google changes the page, or your app shows "Varies with device", you get a `ParseError` instead of
a wrong answer. Put a `jsonProvider` after it in a `chain` so users are never stuck.

### Mock a version in a dev build

```ts
import { setMockVersion } from "@axonpack/in-app-updates";

if (__DEV__)
  setMockVersion({
    latestVersion: "9.0.0",
    minimumVersion: "5.0.0",
    releaseNotes: "Fake notes",
  });
```

or per call: `needUpdate({ mock: { latestVersion: '9.0.0' } })`, or on the component:
`<UpdatePrompt mock={{...}} />`. No request is made while a mock with `latestVersion` is active.
Mocks only work when `__DEV__` is `true`. In a release build they are ignored, so a leftover
`setMockVersion` call cannot fake an update for your users.

### More helpers

- Google Play in-app update, Android only: `startNativeUpdate('flexible' | 'immediate')`,
  `getNativeUpdateInfo()` (priority, staleness, what Play allows), `completeNativeUpdate()` and
  `isNativeUpdateSupported()`. Flexible downloads in the background and reports progress; immediate
  is the full-screen flow. It talks to Google's own Play Core library through a native module in this
  package (needs `expo` and a development build). Play only answers for an app installed from Play,
  so on a debug build it resolves `'unavailable'` and you fall back to `openStore()`.
  `<UpdatePrompt nativeUpdate />` does all of this for you: immediate for a forced update, flexible
  otherwise, store link as the fallback.
- `openStore()`: opens the store page. On iOS it falls back to https if `itms-apps://` is refused.
- `checkOtaUpdate()` / `applyOtaUpdate()`: Expo Updates (optional peer `expo-updates`), so a
  store update and an OTA update share one place. A store update always wins: check it first.
- `compareVersions`, `isGreater`, `satisfiesMinimum`, `diffVersions`, `parseVersion`: the version
  maths. It takes `1`, `1.2`, `1.2.3.4`, a leading `v`, `-beta.2` prereleases and ignores `+build`.
- `clearCache()`, `setVersionInfo()`, `detectCountry()`.
- Errors, all extending `VersionCheckError` with a `.code`: `NetworkError`, `TimeoutError`,
  `AbortedError`, `HttpError` (`.status`), `ParseError`, `NotFoundError`, `InvalidVersionError`,
  `InvalidProviderError`, `VersionInfoUnavailableError`, `UnsupportedPlatformError`.
