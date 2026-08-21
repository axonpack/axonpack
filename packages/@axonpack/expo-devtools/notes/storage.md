# Storage

Every key in every store the app registers, with its value, type and size — searchable, and editable
one key at a time.

## Features

- [x] Register the stores you use — AsyncStorage, MMKV, SecureStore, or your own
- [x] Lists every key with its value, type and byte size
- [x] Inspect a value as a tree
- [x] Edit or delete a key
- [x] Search keys and values, filter by type, sort, group by namespace
- [x] Switch between registered stores
- [x] Refresh on demand, since nothing is recorded continuously
- [x] Says when a store cannot list its own keys, or when the read cap was hit
- [ ] Add a new key
- [ ] History of writes, with revert

## Why it cannot discover anything

This is the one tab unlike all the others. Network patches globals it knows are there and
Performance reads platform APIs, but a key-value store is a separate install with its own native
code — async-storage, MMKV, SecureStore — and this package depends on none of them. Adding one would
force it on every consumer and break the "one native module, on purpose" rule.

So the consumer registers its stores in the client config, next to the WebView names and for the
same reason: a declared list is both the allowlist and the type surface. Four factories cover the
common libraries, and one escape hatch takes any object with get/set/remove.

## Decisions worth knowing

- **Reads are always awaited, sync drivers included.** Awaiting a non-promise costs one microtask
  and removes a second code path, so "sync" is a badge in the UI and an honesty note, never a
  branch.
- **Driver methods are called through the driver object**, never destructured, because a native
  instance's method loses `this` the moment you pull it off it.
- **Both major versions of each library are accepted** — async-storage's `getMany` and `multiGet`,
  and MMKV 3's `delete` and `Uint8Array` alongside 4's `remove` and `ArrayBuffer`. The driver types
  ask for the least they can get away with.
- **MMKV's type is probed, not queried**, since it has no type call: string, then number, then
  boolean, then buffer, each checked against `undefined` rather than truthiness. A stored `0` or
  `false` is a value, and reading it as a miss would hide the key entirely.
- **There is no pause.** That second gate exists for the three tabs recording a stream whose cost is
  continuous; storage is a pull, and its cost is per read. So the toolbar carries Refresh where the
  others carry a record button.
- **There is deliberately no Clear.** That icon means "clear the log" in three other tabs and must
  never come to mean "wipe the user's storage".
- **A value's type is classified once, at read time**, and kept on the entry. Classification parses
  JSON, and re-running it for a thousand keys on every filter keystroke would be the slowest thing
  in the tab.
- **The tab reads on mount, not at startup.** A store the panel is never opened on shouldn't be read
  at all.
- **An edit re-reads the one key it touched** rather than trusting what it wrote, since a store may
  normalise the value, and it writes back through the type the value was read as.

## Won't do

- **Wiping a whole store.** Editing and deleting one key at a time is deliberate.
- **Editing binary values.** There is no text form of the bytes to round-trip, so only their length
  is reported.
- **Listing a store that cannot enumerate.** SecureStore's keychain is addressed by key, not listed,
  so it is told which keys to watch and the summary says that is what it is showing.
