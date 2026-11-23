---
"@axonpack/expo-devtools": patch
---

- **`devtools` finds Metro on any port**: without `--port`, the tool now also looks on `RCT_METRO_PORT` and every port a node process listens on, so an app on `expo start --port 9876` is found
