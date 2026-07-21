# Plan

## @bruin/dev-tools
- debugging tool for bruin packages echosystem
- api call and cache debug
- lite-storage/async-storage/mmkv storage debug
- hooks/component health debug - rerenders, dependencies other matrics

## @bruin/lite-storage
- local storage by sqlite database with in-memory caching
- enable WAL - write ahead log

```javascript
// 1. Enable Write-Ahead Logging (WAL) Mode
db.execSync('PRAGMA journal_mode = WAL;');

// 2. Set a Busy Timeout (Critical for concurrency)
db.execSync('PRAGMA busy_timeout = 5000;'); 

```

## @bruin/i18n
- type safety
- no complex config
- vscode extension

## @bruin/