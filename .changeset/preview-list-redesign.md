---
"@axonpack/preview": minor
---

- **Header card**: the list opens with what runs now, where it comes from and whether it is the default bundle. The facts for a bug report sit behind Show details
- **Use the default bundle**: one button goes back from a preview or a picked dev server
- **Errors in plain words**: a snackbar above the list says what went wrong and what to try, with Retry and Dismiss. On the Android emulator it says how to reach a bucket on localhost
- **Dev servers in one card**: the server the app runs from says Active, the one it starts on says Default bundle, and a chip says `server: Expo` or `server: Preview`. Tap a row to switch to it
- **Preview rows**: `status:` and `env:` chips, the branch, the changelog, who published it and how long ago, and one main action. A broken preview says what happened
- **EAS environment on each preview**: `preview publish --environment` records it, and the list shows it as an `env:` chip
- **Your own theme**: pass a partial theme, or the palette you give `@axonpack/expo-devtools`. New theme keys: `tint`, `tintBorder`, `dangerSurface`, `info`, `accent2` and `accent3`
- **Style it like a FlatList**: `PreviewList` takes FlatList props, such as `contentContainerStyle`, `ListHeaderComponent` and `ListFooterComponent`
- **`usePreviewStatus`**: a new hook that returns everything the header card shows, with `backToDefault()` and `refresh()`, for a banner or badge of your own
- **`Running.kind` is now `"default"`** where 0.1.0 said `"base"`, in `useRunning` and `runningNow`. `source` says where the default bundle comes from
- **Deprecated labels**: `title`, `base`, `backToBase`, `stopDevPreviewServer`, `localSuffix` and `status`. They are still accepted. Use `backToDefault` and `statusShort` instead
- **What runs is what loaded**: a chosen preview that could not start no longer shows as running
- **Switching to a preview while a dev server is picked** now loads the preview
- **A missing or relative bucket URL** now says which setting to fix
