---
"@axonpack/expo-devtools": patch
---

- **Redact WebSocket rows**: `network.redact` now gets socket rows too, told apart by `kind`, to strip a token from the URL or drop the socket
- **Empty breadcrumbs in DevTools**: a crash with no breadcrumbs now says they are on by default and shows how to turn them off
