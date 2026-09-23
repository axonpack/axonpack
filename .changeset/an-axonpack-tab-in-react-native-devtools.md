---
"@axonpack/expo-devtools": minor
---

- **An Axonpack tab in React Native DevTools**, beside Console and Sources, from the one line in `metro.config.js` you already had
- **Nothing to set up on the device**: installing the package registers the tab, behind `__DEV__`
- Removed the `/axonpack-panel` route from the Metro wrap and `PANEL_ROUTE` from its exports. The page behind it was a mock-up and was never in the published files.
