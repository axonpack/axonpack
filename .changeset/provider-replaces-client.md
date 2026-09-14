---
"@axonpack/expo-devtools": major
---

The whole list of what moved where is in
[Upgrading](https://axonpack.github.io/docs/expo-devtools/upgrading).

## ⚠️ Breaking Changes

- Setting the devtools up is now one provider around your app. `createDevtoolsClient`, `init()` and `<DevtoolsOverlay />` are gone, and there is no client to create or pass anywhere:

  ```tsx
  // before
  export const devtools = createDevtoolsClient({ defaultTheme: "dark" });
  if (__DEV__) devtools.init();

  <>
    <YourApp />
    {__DEV__ && <DevtoolsOverlay />}
  </>;

  // after
  <DevtoolsProvider config={{ enabled: __DEV__, defaultTheme: "dark" }}>
    <YourApp />
  </DevtoolsProvider>;
  ```

- **`enabled` is back, and it is the only gate.** With it off the provider patches nothing, records nothing and draws no button, so the mount can stay in a release build unguarded. It is read on the first render, so it cannot be changed later in the session.

- **An in-app browser takes one hook.** `useDevtoolsWebView` returns every prop the `<WebView>` needs, in place of the four client helpers:

  ```tsx
  // before
  <WebView
    ref={devtools.getWebViewRef("checkout")}
    userAgent={devtools.getWebViewUserAgent()}
    injectedJavaScriptBeforeContentLoaded={devtools.getWebViewInjectedJavaScriptBeforeContentLoaded(
      "checkout",
    )}
    onShouldStartLoadWithRequest={devtools.shouldAllowWebViewRequest}
    onMessage={devtools.handleWebViewMessage}
  />;

  // after
  const devtoolsWebView = useDevtoolsWebView("checkout");
  <WebView {...devtoolsWebView} />;
  ```

- **`webviewSources` is gone.** A browser view's name is whatever you hand the hook, and it is only the label its rows carry. Drop the option; nothing needs declaring up front.

- **`mark`, `measure`, `clearMarks`, `clearMeasures`, `setCrashContext` and the stores** now come from the exported `devtools` object: `import { devtools } from '@axonpack/expo-devtools'`.

## ✨ Features

- **Open the panel from your own code.** `useDevtoolsPanel()` gives you `show`, `hide`, `toggle`, whether it is open, and whether the devtools are running at all.
- **Hide the floating button.** `showFloatingButton={false}` leaves the panel working and takes the button off your screens.
- **Everything is patched before your first screen mounts,** including whatever it requests as it appears.
