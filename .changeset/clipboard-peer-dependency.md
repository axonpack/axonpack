---
"@axonpack/expo-devtools": minor
---

- **`expo-clipboard` is now a peer dependency**, so it resolves to the version your own Expo SDK ships. As a direct dependency it was pinned to `~57.0.1`, which tied this package to SDK 57 — that was the only thing that did
- **Install it alongside the others**: `npx expo install @axonpack/expo-devtools react-native-safe-area-context react-native-webview expo-clipboard`
- **The package now ships its `CHANGELOG.md`**, so you can read what changed without leaving `node_modules`
