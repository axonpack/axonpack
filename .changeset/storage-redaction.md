---
"@axonpack/expo-devtools": minor
---

- **`storage.redactKeys`**: list keys, as strings or regexes, and the Storage tab shows their values as `[redacted]`. The list, the detail sheet, copy, export and the DevTools tab never hold the real value
- **`storage.redact(entry)`**: change a value before the tab shows it, or return `null` to hide the key. A hook that throws hides the key
- **Redacted values stay as they are in your store**: you can't edit or delete them from the tab, and an import skips them
