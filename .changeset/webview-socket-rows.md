---
"@axonpack/expo-devtools": patch
---

- **WebView sockets after a reload**: every WebSocket and EventSource a page opens gets its own row, across reloads, navigations and WebViews that share a name
- **WebView page changes**: when a WebView reloads, navigates or unmounts, the old page's open sockets and streams show as closed and its pending requests as canceled
