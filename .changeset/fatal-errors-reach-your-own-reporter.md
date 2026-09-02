---
"@axonpack/expo-devtools": patch
---

- **Your own crash reporter sees JavaScript errors again** — Sentry, Crashlytics or anything else installed alongside now receives every error this catches, fatal ones included
- **A fatal error ends the app**, as it did before these tools were added, and is reported at the next launch
- **React Native's red box is back for fatal errors** in development
- **Unhandled rejections show in the red box too**, rather than only in the Console tab
