---
"@axonpack/expo-devtools": minor
---

- New **Storage** tab: every key in every store you register, with its value, type and byte size, plus the store's total size and largest key
- Register the stores you already use — `asyncStorageAdapter`, `mmkvAdapter`, `secureStoreAdapter`, or `defineStorageAdapter` for anything else — through `createDevtoolsClient({ storage: { adapters } })`. This package still depends on no storage library
- Search keys, values or both, with match case / whole word / regex, filter by value type, sort by key, size or type, and group by the `auth:token` / `cache/user/1` prefixes your keys already use
- Inspect a value in the same expandable JSON tree the Network and Console tabs use, or read the raw characters exactly as stored
- Edit one value or delete one key, with a confirmation on delete. A value is written back through the type it was read as, so a number stays a number. There is no store-wide clear anywhere in the tab
- Honest about what a store can't do: SecureStore's keys can't be listed so you name them, reads stop at `storage.maxKeys` (1,000) and say how many they skipped, and binary values are shown but not editable
- Export the filtered keys of a store as JSON through the share sheet
