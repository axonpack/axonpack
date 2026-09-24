---
"@axonpack/expo-devtools": minor
---

- **An Axonpack tab in React Native DevTools**, beside Console and Sources, from the one line in `metro.config.js` you already had
- **Nothing to set up on the device**: installing the package registers the tab, behind `__DEV__`
- **Chrome's Network panel on the desktop**: the same requests, sockets, filters and settings as the app's Network tab, in a sortable, resizable table
- **Request details**: headers, payload, preview, response, events, timing, cookies and initiator, with a hex dump for a binary body
- **Overrides and blocking**: answer a request with your own status and body, or block its URL, from the request's menu
- **A sandbox on the desktop**: edit any captured request, send it from the device and read the response side by side
- **Code for any request**: cURL, HTTPie, fetch, axios, Node.js, Python, Swift, Kotlin and Go
- **Copy and save to your computer**: copies land on the computer's clipboard, and a response body downloads as a file
- **Network conditions from the desktop**: throttling, custom speeds and the user agent
- **The app's theme in the tab**, with a theme picker, and a Reload chip that reloads the app
- **Open DevTools from the app**: a debug build served by Metro shows a strip in the panel that opens React Native DevTools on the Axonpack tab
- **Fetch/XHR** now keeps every request sent through `fetch` or `XMLHttpRequest`, whatever came back
- Removed the `/axonpack-panel` route from the Metro wrap and `PANEL_ROUTE` from its exports. The page behind it was a mock-up and was never in the published files.
