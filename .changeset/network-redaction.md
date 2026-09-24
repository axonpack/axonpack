---
"@axonpack/expo-devtools": minor
---

- **`network.redactHeaders`**: header names whose values are stored as `[redacted]`, matched without regard to case. The panel, copy, export, the DevTools tab and crash breadcrumbs never hold the real value, and a request replayed from the panel sends the placeholder. Listing `cookie` also redacts a page's `document.cookie`. Empty by default
- **`network.redact(entry)`**: strip tokens from URLs, query strings or bodies before a request is stored, or return `null` to drop it. A hook that throws drops the request
