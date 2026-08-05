# @axonpack/expo-devtools

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
