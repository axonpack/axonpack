---
"@axonpack/expo-devtools": major
---

## ✨ Features

- **Performance** — a new tab showing what your app is doing to the device, with no desktop profiler and no cable.
- Watch the JavaScript memory climb while you use the app, on a live graph.
- See the frame rate, so you can tell a slow screen from a slow network.
- See how long your app took to start, broken into its stages.
- **Long tasks** — a list of every moment the app froze for long enough to notice, with when it happened and for how long.
- **Interactions** — taps that took too long to respond, with the time your own code was responsible for shown separately.
- The panel header now shows your app's own name and icon instead of the devtools' own, so it looks like part of your app.
- Any tab can start switched off, for when you only want one of them recording.

## 🐛 Bug Fixes

- Requests no longer raise an error and go missing from the log when the response comes back as a file, an image, or anything else that isn't plain text. In some apps this affected every request the app made.

## ⚠️ Breaking Changes

- The list of in-app browser views to capture is now given at the top level, as `webviewSources`, instead of inside `network`. It covers both the network and console tabs, so it no longer belongs to either one. Move it up a level:

  ```ts
  // before
  createDevtoolsClient({ network: { webviewSources: ["my-webview"] } });

  // after
  createDevtoolsClient({ webviewSources: ["my-webview"] });
  ```

  Left inside `network` it is silently ignored, and nothing from that browser view is captured.

- The `enabled` option is gone. Guard the `.init()` call instead — until it runs, nothing is recorded:

  ```ts
  if (__DEV__) devtools.init();
  ```
