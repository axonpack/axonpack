---
"@axonpack/expo-devtools": minor
---

- **Redact WebSocket rows**: `network.redact` now gets socket rows too, told apart by `kind`, to strip a token from the URL or drop the socket. `NetworkEntry` and `WebSocketLogEntry` are exported for typing it. Existing hooks start receiving socket rows. A hook that throws on one drops that socket, so check `entry.kind` before reading HTTP-only fields
- **Empty breadcrumbs in DevTools**: a crash with no breadcrumbs now says they are on by default and shows how to turn them off
