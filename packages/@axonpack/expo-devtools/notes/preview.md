# Preview

`@axonpack/preview` set up through the devtools config, and its list as a tab in the panel and in
React Native DevTools.

## Features

- [x] Pass preview's config inside the devtools config, with no preview provider of the app's own
- [x] Preview stays a separate install: an app that doesn't pass its config doesn't need it
- [x] Says how to install preview, at start, when its config is passed and it isn't installed
- [x] Preview keeps confirming each start with the devtools off, so a preview isn't marked broken
- [x] A Preview tab in the panel with preview's own list, in the panel's theme
- [x] The same list as a panel in React Native DevTools
- [x] The tab is left out when no preview config was passed
- [ ] A `devtools` command line topic for previews
- [ ] The config plugin added for the app

## How it works

Preview is an optional peer. The start loads it with a `require` directly inside a `try`, which is
what Metro treats as an optional dependency, so an app without it bundles and runs. It is loaded
only when the config has `preview`. The published types import preview's config type; an app
without preview has `skipLibCheck` on (Expo's base tsconfig sets it), so the import is left
unresolved and nothing else changes. This package's own typecheck resolves preview to its source
through the `expo-source` condition, and reads expo-file-system's published types through a `paths`
entry, since that package's source fails `noUnusedParameters` here.

The missing package throws only with the devtools enabled, and before `started` is set, so every
render says it until the app is fixed. With the devtools off nothing throws: a release build should
never stop over a devtools setting.

Preview's provider goes around the app with the devtools off as well. A preview is a release bundle,
so `enabled: __DEV__` is off inside it, and preview marks a preview broken when its provider never
mounts on that start. This is the one thing besides crash capture that outlives `enabled`. The docs
tell apps to keep the devtools on in the bundles QA switches between, since otherwise there is no
panel to switch back from.

The tab renders preview's `PreviewList`, with the theme store's palette, which preview maps itself.
A React Native DevTools tab is a React root of its own, so its panel mounts preview's provider again
(it reads the list on open and confirms the start again, which changes nothing). It can't run a
`FlatList`, which draws its first rows and stops there, so it passes `virtualized={false}`, and
preview's Add a host field is uncontrolled, since a controlled `TextInput` throws when typed into in
a tab.
