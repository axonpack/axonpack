<div align="center">

<img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/in-app-updates/docs/logo.png" width="88" alt="Axonpack" />

# @axonpack/in-app-updates

**Tell people when a newer version of your app is in the store.**

One component checks the App Store or Play Store and opens a ready-made update prompt. It handles
soft and forced updates, skipping a version, light and dark mode, your own modal, and faking a release
in a development build. The checks are plain JavaScript and run in Expo Go.

**[Documentation](https://axonpack.dev/docs/in-app-updates)** · [Quick start](https://axonpack.dev/docs/in-app-updates/quick-start) · [Reference](https://axonpack.dev/docs/in-app-updates/reference) · [Changelog](https://axonpack.dev/docs/in-app-updates/changelog)

[![npm version](https://img.shields.io/npm/v/@axonpack/in-app-updates.svg)](https://www.npmjs.com/package/@axonpack/in-app-updates)
[![npm downloads](https://img.shields.io/npm/dm/@axonpack/in-app-updates.svg)](https://www.npmjs.com/package/@axonpack/in-app-updates)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/axonpack/axonpack/blob/main/LICENSE)

<table>
  <tr>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/in-app-updates/docs/screenshots/soft.png" width="220" alt="A soft update prompt with Update, Later and Skip this version" /></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/in-app-updates/docs/screenshots/forced.png" width="220" alt="A forced update prompt with only an Update button" /></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/in-app-updates/docs/screenshots/brand.png" width="220" alt="The prompt with a green colour, a serif font and rounder corners" /></td>
  </tr>
  <tr>
    <td>A soft update: people can update, postpone or skip it.</td>
    <td>A forced update: the only way on is to update.</td>
    <td>Your colours, radius and fonts, set as theme tokens.</td>
  </tr>
</table>

</div>

## Installation

```sh
npx expo install @axonpack/in-app-updates expo-application expo-localization
```

`expo-application` supplies the installed version and `expo-localization` picks the App Store
country. Both are optional peer dependencies, so each resolves to the version your Expo SDK ships,
and a project without them still bundles.

## Setup

Add one component to your root component. That is the whole setup: no config plugin, no `app.json`
changes, and no native code to write.

```tsx
import { UpdatePrompt } from "@axonpack/in-app-updates";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <Text>My app</Text>
      <UpdatePrompt />
    </View>
  );
}
```

When the store has a newer version than the one installed, the prompt opens. To make big releases
mandatory, add `required="major"`. To see the prompt before you publish anything, use a mock in a
development build:

```ts
import { setMockVersion } from "@axonpack/in-app-updates";

if (__DEV__)
  setMockVersion({ latestVersion: "9.0.0", releaseNotes: "Fake notes" });
```

A mock is ignored outside `__DEV__`, so it can never reach a release build.

## Documentation

Everything else is on the docs site.

| Page                                                                                | What is on it                                                     |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Quick start](https://axonpack.dev/docs/in-app-updates/quick-start)                 | A check, a hook and a prompt, each in a few lines                 |
| [The update modal](https://axonpack.dev/docs/in-app-updates/modal)                  | Every state of the default modal, with screenshots                |
| [Theming](https://axonpack.dev/docs/in-app-updates/theming)                         | Colours, radius, fonts, labels and the icon                       |
| [Your own modal](https://axonpack.dev/docs/in-app-updates/custom-modal)             | Keep the checking and skipping, draw the prompt yourself          |
| [Force and skip](https://axonpack.dev/docs/in-app-updates/force-updates)            | Mandatory updates, minimum versions and skipping a version        |
| [Providers](https://axonpack.dev/docs/in-app-updates/providers)                     | The App Store, the Play Store, or your own JSON endpoint          |
| [Version formats](https://axonpack.dev/docs/in-app-updates/versions)                | Dates, four-part numbers, beta and canary tags, build numbers     |
| [Play in-app updates](https://axonpack.dev/docs/in-app-updates/play-in-app-updates) | Update through Google's own screen on Android                     |
| [Testing](https://axonpack.dev/docs/in-app-updates/testing)                         | Fake a release, and test the real Play flow                       |
| [Troubleshooting](https://axonpack.dev/docs/in-app-updates/troubleshooting)         | Why the prompt does not show, and what to check                   |
| [Reference](https://axonpack.dev/docs/in-app-updates/reference)                     | Every function, option, result field and error                    |
| [Changelog](https://axonpack.dev/docs/in-app-updates/changelog)                     | Every published release, also in [`CHANGELOG.md`](./CHANGELOG.md) |

## Example app

`example/` is a runnable Expo app with one chip per state of the prompt: live, soft, expanded,
forced, dark, brand, minimal, build, custom, none and native. It shows the real store answer for an
app of your choosing.

```sh
cd example
APP_ID=com.example.app APP_VERSION=1.0.0 bun run ios   # or: bun run android
```

`APP_ID` and `APP_VERSION` make the example install as your own published app, so the stores answer
for it.

## What's built, and what isn't

See [the feature list](https://github.com/axonpack/axonpack/blob/main/packages/@axonpack/in-app-updates/notes/README.md) for what's built, what the platform genuinely can't do (and why this
doesn't fake it), and what's still on the table.
