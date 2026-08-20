# Plan

Free OSS foundation libraries for React Native / Expo. Priority order below is based on what's
already duplicated across our apps.

A package that exists keeps its own feature list, so its entry here is one line and a link. A package
that does not exist yet keeps its intent bullets here until the day it does.

## @axonpack/lite-storage

_Planned — no package yet._

- local storage by sqlite database with in-memory caching
- one `AsyncStorage` interface, swappable sqlite/mmkv backends
- debounced + batched writes (single transaction)
- useCase namespacing; drop-in for common state-management persistence middleware
- enable WAL - write ahead log

```javascript
// 1. Enable Write-Ahead Logging (WAL) Mode
db.execSync("PRAGMA journal_mode = WAL;");

// 2. Set a Busy Timeout (Critical for concurrency)
db.execSync("PRAGMA busy_timeout = 5000;");
```

## @axonpack/expo-devtools

_Shipped — the only implemented package._

On-device, prod-safe debug tools with no desktop app: network, console, storage, performance and
crash tabs behind a draggable dev button. Features and what is still missing:
[feature list](../packages/@axonpack/expo-devtools/notes/README.md).

## @axonpack/api-kit

_Planned — no package yet._

- HTTP client factory with auth
- single-flight 401 refresh + retry
- token service (sync cache + debounced persist)

## @axonpack/i18n

_Planned — no package yet._

- type safety
- no complex config
- vscode extension
