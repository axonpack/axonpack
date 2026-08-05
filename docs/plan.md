# Plan

Free OSS foundation libraries for React Native / Expo.
Priority order below is based on what's already duplicated across our apps.

## @axonpack/lite-storage

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

- on-device, prod-safe debug tool (no desktop app)
- draggable DEV FAB
- network / storage / database / console inspector tabs
- console ring-buffer capture
- logger

## @axonpack/api-kit

- HTTP client factory with auth
- single-flight 401 refresh + retry
- token service (sync cache + debounced persist)

## @axonpack/i18n

- type safety
- no complex config
- vscode extension
