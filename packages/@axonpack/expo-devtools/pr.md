# 📝 Why & how

This PR adds `@axonpack/expo-devtools` (https://github.com/axonpack/axonpack/tree/main/packages/%40axonpack/expo-devtools) package to the directory.

**Browser-style devtools that live inside a React Native or Expo app** — no desktop debugger, no
cable, nothing to attach. A floating button opens an on-device panel with six tabs:

- **Network** — every `fetch`, `XMLHttpRequest` and in-app WebView request, with full request and
  response bodies, a resend sandbox, throttling, and copy-as-cURL/fetch
- **Console** — captured logs with an explorable JSON tree, level filters, and a prompt that
  evaluates in the app's own context
- **Performance** — frame rate, JS heap, startup timing, long tasks and slow interactions
- **Storage** — browse, search, edit, add, import and export keys from any store you register
  (AsyncStorage, MMKV, SecureStore, or your own adapter)
- **Crashes** — fatal and non-fatal JS errors, unhandled rejections, React render errors and
  uncaught native exceptions, with symbolicated stacks and breadcrumbs
- **Debug** — block or crash a chosen thread on purpose, to see how the app behaves

Points that may matter for the listing:

- **Safe to leave in a production build.** Nothing is patched and nothing is recorded until `init()`
  is called, so guarding that single call leaves the entire package inert.
- **Registers rather than discovers storage.** The consumer passes in its own store adapters, so the
  package depends on no storage library and forces none on anyone.
- **One small native module** (iOS Swift + Android Kotlin, via the Expo Modules API), used only to
  block the main thread and read the real process start time. Everything else is TypeScript, and the
  package degrades gracefully in Expo Go where that module is absent.
- No config plugin and no `app.json` changes — install, call `init()`, mount `<DevtoolsOverlay />`.
- iOS and Android. MIT.

Docs: https://axonpack.github.io/docs/expo-devtools

> [!NOTE]
> This is an automatic submission created via `rn-directory` CLI.

# ✅ Checklist

- [x] Added library to **`react-native-libraries.json`**
