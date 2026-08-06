# @axonpack/expo-devtools

## 1.1.0

### Minor Changes

- ea2f7c7: ## ✨ Features

  - **Console** — a new tab in the devtools panel showing everything your app logs, without a desktop debugger attached.
  - Warnings and errors are coloured and counted, so problems stand out while you scroll.
  - Objects and arrays can be opened up and explored, instead of appearing as `[object Object]`.
  - Errors show their full stack when you tap them.
  - The same message logged over and over collapses into one line with a count, so a chatty screen doesn't bury everything else.
  - **Run an expression** — type JavaScript at the prompt and see the result straight away, with name suggestions as you type.
  - Tap a command you ran earlier to load it back into the prompt and send it again.
  - Anything logged inside an in-app browser page is captured too, labelled so you can tell it apart from your app's own output.
  - Filter by level or by where a message came from, or search the text of every message.
  - The list follows new output as it arrives, and holds still when you scroll back to read something, with a button to jump to the newest again.
  - Copy any line with one tap.
  - Nothing is captured until you turn devtools on, the same as the network inspector, and the expression prompt stays out of production builds unless you ask for it.

### Patch Changes

- f331f08: ## ✨ Features

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

## 1.0.1

### Patch Changes

- ## 🐛 Bug Fixes
  - Fixed links on the npm package page that pointed to the project's old GitHub location.

## 1.0.0

### Major Changes

- b1abc8e: ## ✨ Features

  First release of `@axonpack/expo-devtools` — an on-device network inspector for React Native and Expo apps.

  - A draggable button opens a full network inspector right inside your app, no desktop tool needed.
  - Nothing is captured until you turn it on, so it's safe to leave in a production build.
  - Requests made with `fetch`, `XMLHttpRequest`, and popular HTTP client libraries (like axios) are captured automatically.
  - Requests made inside an in-app browser view can be captured too, once you opt a screen into it.
  - Search and filter requests by method, type, or source, and reverse the sort order.
  - A tap-to-filter activity graph shows your request traffic over time, with time labels.
  - Tap any request to see its headers, a pretty-printed preview, the raw response, and timing details.
  - Image, HTML, and SVG responses show up as an actual preview, not just raw text.
  - Failed requests (4xx/5xx) are clearly marked in red so they stand out from successful ones.
  - Copy any header value, the full request URL, or a ready-to-paste cURL command with one tap.
  - A built-in sandbox lets you edit and resend any captured request — method, URL, headers, query params, or body — and see the response live.
  - Export your current, filtered request log to share it with someone else.
  - Request and response bodies are always shown in full, never cut off.
