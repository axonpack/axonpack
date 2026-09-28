---
"@axonpack/expo-devtools": patch
---

- `network.redact` now sees WebSocket rows too, told apart by `kind`, so a token in a `wss://` URL can be stripped or the socket dropped. Socket frames and stream events still do not pass through it.
