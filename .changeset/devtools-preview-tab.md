---
"@axonpack/expo-devtools": minor
---

- **Preview from the devtools config**: pass `@axonpack/preview`'s config as `preview` and the devtools mount its provider around your app, so the app sets nothing else up. Preview stays a separate install with its own config plugin, as an optional peer, and an app without the key doesn't need it
- **Preview tab**: preview's list in the panel, in the panel's theme, and as a panel in React Native DevTools. It shows only when `preview` is set
- **Says when preview is missing**: with `preview` set and the devtools on, the start throws and says how to install `@axonpack/preview` and rebuild. With `enabled: false` nothing is thrown
- **Works inside a preview**: preview's provider mounts with `enabled: false` too, so a preview's start is still confirmed. Keep the devtools on in the bundles QA switches between to reach the tab from inside a preview
