---
"@axonpack/expo-devtools": minor
---

- New **Crashes** tab: every crash the app has hit, with the unread count on the tab itself
- **Crash report sheet** opens the moment a crash is caught, with the message, stack, component stack, breadcrumbs, device details and the raw record
- **Copy and share** any report as Markdown or JSON, straight to the share sheet
- **Crashes that end the app** are saved to the device and reported the next time it opens
- **Catches four kinds of crash**: fatal and non-fatal JavaScript errors, unhandled promise rejections, React render errors, and uncaught native exceptions on iOS and Android
- **Unhandled promise rejections are now caught in release builds**, which React Native only reports during development
- New **`DevtoolsErrorBoundary`** shows a Try again screen where a render error used to leave a blank one, and records which component threw
- **Keep crash reporting on in production** with `crash.enableWhileDevtoolsDisabled` — it works whether or not you start the devtools, and the panel, the console prompt and request logging all stay off
- **Only crashes that actually close the app are reported in production** — JavaScript errors the app recovered from stay a development concern
- **Turn off React Native's red box** with `crash.disableDefaultLogBox`, so a JavaScript error is reported in one place
- **The floating devtools button now hides itself** unless the tools were started, so leaving it mounted in a release build shows nothing
- **A plain crash notice outside development** — what broke, when, and a Share report button — rather than the developer sheet with its tabs and stack traces
- **Restart the app from the crash notice** on Android; iOS shows Close, since Apple allows no app to relaunch itself
- **Breadcrumbs** replay the console and network activity leading up to a crash
- **`redact`** rewrites or drops a report before it is stored, saved or handed to `onCrash`
- **`setCrashContext`** attaches your own details — user, screen, feature flags — to every report
