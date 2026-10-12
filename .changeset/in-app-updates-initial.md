---
"@axonpack/in-app-updates": minor
---

- **New package**: a store version check for React Native and Expo: `needUpdate`, `getLatestVersion`, `getStoreUrl`, `getCurrentVersion` and more
- **Force update**: `minimumVersion` marks a build as unsupported, `required` makes updates mandatory by rule (all, or by size), `canSkip: false` removes the skip button, and `skipVersion` mutes one soft update
- **Providers**: App Store, Play Store, a JSON endpoint (a static file or your own API) and `chain` to fall back from one to the next
- **Update modal**: `UpdatePrompt` shows a ready-made modal with an icon, versions, release notes and actions. It follows light and dark mode, and takes colour, radius and font tokens. Pass `component` to use your own
- **`useVersionCheck`**: a hook with loading, error and result state that checks again when the app returns to the foreground
- **Google Play in-app update** (Android): `startNativeUpdate`, `getNativeUpdateInfo` and `completeNativeUpdate`, written against Google's Play Core library. `<UpdatePrompt nativeUpdate />` runs the immediate flow for a forced update and the flexible one otherwise
