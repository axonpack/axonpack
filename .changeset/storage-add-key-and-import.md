---
"@axonpack/expo-devtools": patch
---

- **Add a key** to a store from the Storage tab — you pick the name, the type and the value, and a key that already exists is refused
- **Import a snapshot** back into a store: paste the file and see what it would add, overwrite, skip or leave alone before anything is written
- **Exported snapshots carry a version**, so the tab knows whether it can read one back
- **Blacklist keys per store** with a pattern or a function — a match is never listed, never read and never written
- **Declare which types a store accepts**, so the Add-key sheet only offers what that store can keep
- **A store's fixed key list can now be a function**, re-read on every refresh
