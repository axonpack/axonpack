---
"@axonpack/in-app-updates": minor
---

- **New package**: a store version check for React Native and Expo: `needUpdate`, `getLatestVersion`, `getStoreUrl`, `getCurrentVersion` and more
- **Force update**: `minimumVersion` marks a build as unsupported, and `skipVersion` mutes one soft update
- **Providers**: App Store, Play Store, a JSON endpoint (a static file or your own API) and `chain` to fall back from one to the next
- **`useVersionCheck`**: a hook with loading, error and result state that checks again when the app returns to the foreground
- **Google Play in-app update** (Android): `startNativeUpdate`, `getNativeUpdateInfo` and `completeNativeUpdate`, written against Google's Play Core library. `<UpdatePrompt nativeUpdate />` runs the immediate flow for a forced update and the flexible one otherwise
