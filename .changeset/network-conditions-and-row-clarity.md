---
"@axonpack/expo-devtools": patch
---

## ✨ Features

- **Network throttling** — try your app on a slow connection without leaving your desk. Pick Slow 3G, Fast 3G, Fast 4G or Offline, or set your own speed and delay.
- Throttling applies to your app's own requests and to requests made inside an in-app browser view.
- **User agent** — pretend to be an iPhone, an Android phone, a desktop browser or Googlebot, or type your own.
- Both settings take effect straight away, with no need to restart the app.
- Every captured request now shows the connection settings it actually ran under, so requests recorded before and after a change stay easy to tell apart.
- The sandbox has its own connection settings section, so you can slow a request down while trying it out.
- The devtools panel and its pop-up sheets now carry the axonpack logo.

## 🐛 Bug Fixes

- Requests an in-app browser page makes while it is still loading are now captured. Previously they were missed entirely.
- Requests still in flight now stand out as an amber "PENDING" instead of blending into the rest of the row.
- Request rows show a proper icon for each kind of response, instead of the words "HTTP", "CSS" and "JS".
- JSON responses now have their own orange marker.

## ⚠️ Breaking Changes

- If you capture requests from an in-app browser view, rename `getWebViewInjectedScript` to `getWebViewInjectedJavaScriptBeforeContentLoaded` and pass it to the `injectedJavaScriptBeforeContentLoaded` prop instead of `injectedJavaScript`. The new prop runs earlier, which is what lets requests made during page load be captured.
