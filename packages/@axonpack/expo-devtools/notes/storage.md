# Storage

Every key in every store the app registers, with its value, type and size — searchable, and editable
one key at a time.

## Features

- [x] Register the stores you use — AsyncStorage, MMKV, SecureStore, or your own
- [x] Lists every key with its value, type and byte size
- [x] Inspect a value as a tree, or as the raw text it is stored as
- [x] Edit or delete a key
- [x] Search keys and values, filter by type, sort, group by namespace
- [x] Switch between registered stores
- [x] Refresh on demand, since nothing is recorded continuously
- [x] Says when a store cannot list its own keys, or when the read cap was hit
- [x] Export a snapshot of the keys on screen
- [x] Probes MMKV's type in an order its getters agree on — buffer ahead of the numeric ones
- [x] Add a key, choosing its type, refusing one the store already holds
- [x] Declares which types a store accepts, and offers only those
- [x] A schema version on the snapshot export, the way the network export carries one
- [x] Blacklist keys per store, enforced at read time so they never leave the device
- [x] Import a snapshot, saying what it would add, overwrite, skip or leave alone before it writes
- [x] A fixed key list can be a function, resolved on each read
- [ ] Live updates from a store that publishes a change listener, as MMKV does
- [ ] Page past the read cap, or list keys first and fetch values on demand
- [ ] Show binary values as hex, and edit them there
- [ ] History of writes, with revert

## Next

The open list above is a menu, not an order. What is worth doing next, and why, roughly in that
order:

1. **Live updates.** Only where the store publishes a listener — MMKV does. Needs the echo from our
   own writes suppressed, or an edit re-reads itself.
2. **Paging past the cap.** We read the whole store to `maxKeys` and hold every value; past that we
   say how many were skipped, which is honest but still leaves a 10,000-key store showing 1,000. The
   in-process argument that makes fetch-on-demand pointless for network bodies does not apply — this
   is memory and read time, not a bridge.
3. **Hex.** Costs more than it looks, and the view comes before the editor: the adapter would have
   to carry the bytes through the read path, where today it returns the string
   `"${byteLength} bytes"`. The primitive itself already exists in `core/` — nothing in this tab has
   bytes to hand it.

`examples/STORAGE-GAP.md` carries the paths behind each of these, on both sides.

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
- **MMKV's type is probed, not queried**, since it has no type call, and every check is against
  `undefined` rather than truthiness. A stored `0` or `false` is a value, and reading it as a miss
  would hide the key entirely.
- **The probe order is not the obvious one**, because the getters disagree with each other on the
  same key: `getString` lenient-decodes non-UTF-8 bytes to `''` on some platforms, and `getNumber`
  reads any 8-byte payload as a double whatever wrote it. So a non-empty string comes first, then a
  non-empty buffer, then number, then boolean, and a deliberate empty string is caught at the bottom
  once a buffer at that key is ruled out. Bytes that happen to be valid UTF-8 still read as a
  string; nothing can tell those from a string that was written as one.
- **There is no pause.** That second gate exists for the three tabs recording a stream whose cost is
  continuous; storage is a pull, and its cost is per read. So the toolbar carries Refresh where the
  others carry a record button. That is a statement about cost, not about capability: a store that
  publishes its own changes can be followed without recording anything, which is a separate item
  above.
- **There is deliberately no Clear.** That icon means "clear the log" in three other tabs and must
  never come to mean "wipe the user's storage".
- **A value's type is classified once, at read time**, and kept on the entry. Classification parses
  JSON, and re-running it for a thousand keys on every filter keystroke would be the slowest thing
  in the tab.
- **The tab reads on mount, not at startup.** A store the panel is never opened on shouldn't be read
  at all.
- **An edit re-reads the one key it touched** rather than trusting what it wrote, since a store may
  normalise the value, and it writes back through the type the value was read as.
- **Adding a key is not an edit with a blank value.** The type is chosen instead of inherited, and a
  key the store already holds is refused rather than overwritten. The existence check asks the store
  rather than the list on screen: the list is as old as the last read, and a store that cannot
  enumerate holds keys the list never had.
- **A blacklisted key is filtered in the adapter, not in the view.** The point of the list is that
  the value never reaches memory, so the filter sits in front of the read rather than in front of
  the render — and in `defineStorageAdapter` rather than in `readAdapter`, so no path that lists keys
  can forget it. A `/g` regex has its `lastIndex` reset before every test, or the same key would
  match, then not match, then match again. The summary says a blacklist is set and never how many
  keys matched: that is a count this tab deliberately never learns.
- **The export carries a schema version**, as the network export does. The first change to that shape
  would otherwise break every file already written with no way to tell one from the other, and the
  importer refuses a version it does not read rather than hoping the fields it needs are there.
- **An import says what it would do before it does it**, and the categories are the honest ones: new,
  overwritten, already holding exactly that value, and skipped with the reason. It comes back the way
  it left — as text, pasted — because there is no filesystem module here and no dev server to upload
  to. Keys are written one at a time so a failure names the key that caused it, and the store is
  re-read afterwards rather than patched key by key.
- **A store says which types it can hold**, and the Add sheet offers only those. AsyncStorage and
  SecureStore hand back a string whatever went in, so both declare `['string']` and never offer a
  number the store would flatten. Binary is offered by neither create nor edit — there is still no
  text form of the bytes to round-trip.

## Won't do

- **Wiping a whole store.** Editing and deleting one key at a time is deliberate.
- **Listing a store that cannot enumerate.** SecureStore's keychain is addressed by key, not listed,
  so it is told which keys to watch and the summary says that is what it is showing.
- **Tools for something outside the app to read or write the store with.** The same answer as the
  Network tab's, and for the same reason: the panel is in the app's own process, and addressing it
  from outside would mean a channel to a dev server this package does not have.
