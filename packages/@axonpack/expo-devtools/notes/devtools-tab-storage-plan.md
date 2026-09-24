# DevTools tab storage plan

The Storage panel in React Native DevTools, feature for feature with the on-device Storage tab.
Written 2026-09-24. The device side is done, so the work is drawing it in the tab. All new code
lives in `src/devtools-remote-tab/components/storage-panel/`, the same way the Network panel lives
in `network-panel/`.

**Steps 1 to 8 are built** (2026-09-24). A render test drove the whole panel against an in-memory
store: drawing, opening a key, an edit, a delete through the confirm, an add, a filter set from the
shared store, Import, and a store switched from the app. Step 9, the walk against a real device in
React Native DevTools, is not done, so no line below is ticked yet.

## Business flow

Every line below is something the on-device tab already does. Nothing here is new behaviour.

### Getting to the keys

- [ ] Opening the Storage panel reads every registered store, and nothing is read before that.
- [ ] With the devtools off, the panel says they are not running, not that no store is registered.
- [ ] With no stores registered, the panel says why it cannot find them and shows the setup code.
- [ ] With two or more stores, a dropdown picks one, each with its key count and a tick on the
      active one. With one store there is no dropdown.
- [ ] Switching stores closes whatever key, add form or import was open.
- [ ] Refresh re-reads the store on screen.
- [ ] There is no record button and no clear button.

### The summary

- [ ] The store's name, whether it is sync or async, and when it was last read ("not read yet"
      before the first read).
- [ ] How many keys, or "N of M keys" while a filter hides some.
- [ ] The total size, and the largest key with its size.
- [ ] The read error, when the store's read failed.
- [ ] A line for each of: the store cannot list its keys (so these are the declared ones), the
      read stopped at the cap (read N of M), the store is read-only, a blacklist is set.

### The list

- [ ] One row per key: its type (icon, colour and label), the key, a one-line preview of the value,
      and its size in bytes.
- [ ] The preview folds whitespace, stops at 120 characters, shows a dash for a missing value and
      "(empty)" for an empty one.
- [ ] A key that failed to read shows its error in place of the preview.
- [ ] Search matches are marked in both the key and the preview.
- [ ] Empty list text: "Reading…", "This store holds no keys", or "No keys match your filter".
- [ ] Group by namespace: keys grouped by the prefix before `:`, `/`, `.` or `_`, groups in name
      order, each titled with its count, the rest under Ungrouped.
- [ ] A row's menu: Copy key, Copy value, Copy as JSON, and Copy value (formatted) for a JSON value.
      Copies land on the computer's clipboard.

### Filtering and sorting

- [ ] Search with match case, whole word and regex, marked invalid when the regex does not compile.
- [ ] Search in keys and values, keys only, or values only.
- [ ] Invert the search and the type filter. The two hide switches are not inverted.
- [ ] Filter by type, with a count per type, offered only when the store holds more than one type.
- [ ] Hide empty values. JSON values only.
- [ ] Sort by key, size or type, ascending or descending. Type sort keeps keys in order inside a
      type.
- [ ] A count of what the filters keep, and one button to clear every filter, off when none is set.

### One key

- [ ] Clicking a row opens that key in a pane with four tabs: Value, Raw, Edit, Info.
- [ ] Opening a different key goes back to Value and clears the pane's search.
- [ ] The key name at the top, selectable.
- [ ] Value draws JSON as a tree and anything else as text, with a copy button. A failed read shows
      its error, a missing value says so, and a binary value shows its length with a line saying
      why that is all.
- [ ] Raw shows the characters exactly as stored, with the character count, the size and a copy
      button.
- [ ] Value and Raw have their own search with the three modes, marked in the tree and the text,
      and a note when the value is too long to mark.
- [ ] Info lists the key, the store and its kind, shown-as type, stored-as type, size in bytes and
      characters, when it was read, and whether it can be edited or deleted, plus any read error.
- [ ] The pane's menu has the row's copies, and Delete key when the store allows it.
- [ ] Delete asks first, names the key and the store, and closes the pane once the key is gone. A
      failed delete says why.
- [ ] A key deleted from anywhere (the app included) closes its pane.
- [ ] The pane follows the key, so an edit made on the device shows in the open pane.

### Editing

- [ ] Edit says why it cannot, for a read-only store, a store with no write, or a binary value.
- [ ] Edit says how the value is written back: as a number, as `true`/`false`, or as text into this
      store under this key.
- [ ] A warning, not a block, when a value stored as JSON no longer parses.
- [ ] Revert and Save are off until something changed. Save shows "Saving…" and any error.
- [ ] After a save the field shows what the store holds now, not what was typed.

### Adding a key

- [ ] Add key is offered only for a store that can be written.
- [ ] A key name, a type (only the types this store takes, and no choice when it takes one), and a
      value: true/false for a boolean, a number field that flags a bad number, text otherwise.
- [ ] A note when the store takes one type only, and a note when it cannot list its keys (the new
      key may vanish on the next refresh).
- [ ] Add is off until the key is named (and the number is valid). A key the store already holds is
      refused with a message.
- [ ] Opening the form clears it. A failed add keeps what was typed.

### Export and import

- [ ] Export downloads the keys the filters keep as a JSON file, with the schema version, named
      after the store and the time.
- [ ] Import is offered only for a store that can be written.
- [ ] Paste a snapshot into the import field. Nothing is written until asked.
- [ ] The import says what is wrong with a file that is not JSON or not a snapshot, naming where.
- [ ] Before writing, it says how many keys are new, overwritten, already matching and skipped, and
      why they were skipped. It warns when the file came from a different store.
- [ ] Write N writes them, then says how many were written and names every key that failed.
      Cancel becomes Done after a clean write. "Nothing to write" when there is nothing.

### Editing in the table

These go past the app, which edits one key at a time in a sheet. A desktop table is where people
expect to type into a cell, the way a database table editor works.

- [ ] Double-click a value to edit it in its cell. Enter or clicking away keeps the change, Escape
      drops it.
- [ ] A value with line breaks opens in the Edit tab instead, since a one-line cell would lose them.
- [ ] An empty row at the bottom takes a new key, its type and its value. Enter adds it.
- [ ] Nothing is written until Sync. Changed cells and new rows are marked until then, and Sync
      shows how many are waiting.
- [ ] Discard drops every waiting change.
- [ ] A change that fails stays marked with its reason, and the rest are written.
- [ ] A waiting edit to a key deleted meanwhile is refused, not written back.
- [ ] Waiting changes survive switching to another panel and back.

### Both surfaces

- [ ] A write, a delete, an add or an import done in DevTools shows on the device at once, and the
      other way round.
- [ ] Reading on the desktop changes nothing about how the device panel works.

## Reference behaviour

**Chrome's Application panel, Local Storage view**, is the model for the layout: a toolbar with
refresh, filter and delete, a Key / Value table, and the selected value below or beside it. The
same frontend is React Native DevTools, so people already know it.

Not mirrored:

- **Chrome's Clear all.** The device tab deliberately has no clear, and that icon means "clear the
  log" in the Network panel. It must never come to mean "wipe the user's storage".
- **Chrome's inline editing of a key.** Only the value is edited in place. Renaming a key is a
  write and a delete, which no store does as one step, so a failure halfway would leave both keys
  or neither.
- **Chrome's write on Enter.** Here Enter keeps the change and Sync writes it, as a database table
  editor does, so a batch of edits lands together and can be dropped before it does.
- **Chrome's Delete selected in the toolbar.** Deleting is in the key's menu, one key at a time, as
  on the device.
- **The device's "scroll to the top when Filter opens"** and its layout animations. The filter bar
  here is pinned above the table, not inside the scroll, so there is nothing to scroll back to.
- **The device's Paste button in Import.** See the constraints below.

## Architecture

### Nothing new on the device side

Every step already exists as a pure function or a service the tab can call as is:
`storageStore` (and `useStorageStore`), `readAllAdapters`/`readAdapterById`, `setStorageValue`,
`createStorageKey`, `removeStorageKey`, `applyStorageImport`, `matchesFilters`, `sortEntries`,
`hasActiveFilters`, `DEFAULT_STORAGE_FILTERS`, `namespaceOf`, `previewLine`, `formatReadTime`,
`describeAdapterKind`, `formatSize`, `buildStorageExport`, `parseStorageExport`,
`planStorageImport`, `creatableValueTypes`, `isEditableValueType`, `parseStoredJson`,
`isTreeValue`, `storedValueColor`, `STORED_VALUE_KINDS`/`_LABELS`, `buildMatcher`, `findMatches`,
`MAX_SEARCHABLE_LENGTH`, and the ones below. A filter or a plan that behaves differently in the tab
would be a bug in both, so none of them is written again.

**What both surfaces show lives in `storageViewStore`**: the active store, the filters, the sort
and its direction, and grouping by namespace. So a filter set in DevTools shows on the phone, as
Network's `networkViewStore` does. Which key is open, and which pane or sheet, stays each surface's
own. Switching the store from either surface closes the other's open key and sheets.

**Steps that lived inside device components moved to `features/storage/`** so the tab calls the
same code: `storageCopyTexts` (the device maps it onto `Clipboard`, the tab onto
`COPY_ATTRIBUTE`), `readStorageImport` with `STORAGE_IMPORT_SKIP_REASONS`, `storageExportFileName`,
`countByKind`, `groupByNamespace`, `summarizeStorage` (the totals and the four notes),
`emptyListLabel`, and `STORAGE_SETUP_SNIPPET`.

### What the platform refuses, and what that forces

**A handler runs in the app, not in the browser.** So:

- **Copies use `COPY_ATTRIBUTE`.** A handler calling `Clipboard` would copy onto the device. Every
  copy (row menu, pane menu, the Value and Raw copy buttons, the tree's own menu) carries its text
  on the element instead, the way the Network entry menu does.
- **Delete cannot use `Alert.alert`.** The alert would pop up on the phone. The confirm is drawn in
  the tab: the menu's Delete key opens an inline "Delete "key" from Store? Cancel / Delete" bar in
  the pane. A failed delete shows its message in that bar, not in an alert.
- **Import cannot read the computer's clipboard.** `Clipboard.getStringAsync` would read the
  device's. A file picker cannot help either: an event reaches the app as
  `{ type, target: { value, checked } }`, so a chosen file's contents never cross. The import
  field is a textarea the user pastes into with Cmd+V. That is the one device control with no
  twin here.
- **Export is a download link.** A click cannot wait on the app, so the file is a `data:` URL on an
  `<a download>`, built on hover, the way the Network toolbar does it. The rows are the ones the
  filters keep at hover time.

**Text entry crosses one keystroke at a time.** A controlled input loses characters, so every field
(the list search, the pane search, the edit textarea, the add form, the import textarea) uses
`SyncedInput`, with `multiline` for the textareas. After a save, the entry arriving with new text
is what remounts the edit field, which is what `SyncedInput` does on an outside change.

**A `FlatList` or `SectionList` cannot cross** (see `react-native-devtools.md`). The list is a CSS
grid of `div`s, every row drawn. The read is capped at `storage.maxKeys` (1,000 by default), which
the Network grid already draws at that size. An app that raises the cap past a few thousand is what
`react-native-devtools-tab/notes/virtual-list-plan.md` is for, and this panel moves onto that list
when it lands.

**There is no bottom sheet and no modal**, since a tab is its own React root. The key pane opens
beside the table with the split drag, as the request pane does. Add key and Import open in that
same pane in place of a key, the way the override editor and sandbox do in Network.

**Icons do not cross as a font.** The kind icons (`data-object`, `data-array`, `text-fields`,
`numbers`, `toggle-on`, `memory`, `remove`, `help-outline`) and the toolbar's add, upload and
refresh marks would need SVGs in `MATERIAL_ICONS`, a file the whole tab shares. So a kind is its
coloured label, and Refresh, Add key and Import are text buttons. Filter and Export have Chrome
icons already.

**A right-click is the long press.** A row's menu opens on `onContextMenu` and is drawn under the
row, since no pointer position reaches the app. The same for the tree's own menu, which already
works through `TAB_PRIMITIVES`.

### Layout

```
[**store** ▾] Async  Read 21:13:32 | ⟳ Refresh  Add key | Sync 3  Discard | ⏷ | ⤓  Import
[filter____ Aa ab .*] ☐ Invert  ⌫ | Keys+values ▾ | More ▾ | All  Object  Array  String …
notes, only when there are any: cannot list keys / capped / read-only / blacklist / read error
Key            | Type   | Value                          | Size  ‖  Value  Raw  Edit  Info   ⋮
auth:token     | String | eyJhbGciOi…                    | 812 B ‖  auth:token
[new key]      | String ▾ | [value]                      | Add   ‖
…                                                                ‖  [search this value]
                                                                 ‖  tree / text
status bar: 120 / 340 keys · 48.2 kB · largest cache:feed 12 kB
```

- **Columns**: Key, Type, Value, Size. Key, Type and Size headers sort (Value has no sort on the
  device either). Resizable with `ColumnResizer`. With a key open, the table narrows to the Key
  column alone, as Network does.
- **Filter bar**: scope and More (group by namespace, hide empty, JSON only) are dropdowns rather
  than chips, since the bar is one line, the way Network's More filters is. The type buttons are
  the device's chips, shown only when more than one type is present, each with its count. The store
  picker and the scope are native `select`s: the Network CSS anchors its dropdown menu by one fixed
  anchor name, so there is room for one such menu per bar, and More filters has it.
- **Summary**: the store's name (or the picker, in bold), its sync or async badge and when it was
  read sit in the toolbar. The notes sit above the table only when there are any, and the counts in
  a status bar below, as Network's summary bar does.
- **In-place edits** are the tab's own pending changes, in `storageDraftsStore`, and
  `syncStorageDrafts` writes them one key at a time through the same `setStorageValue` and
  `createStorageKey` the app uses. A store rather than panel state, so leaving the panel keeps
  them. **A handler cannot stop a click bubbling**, so the row has no click of its own: each cell
  opens the pane except an editable value, or the first click of a double-click would open the pane
  and hide the value. The events carry `key`, which is what makes Enter and Escape work, but a
  handler cannot cancel one, so a cell is an `input` and never a `textarea`.

### Files

```
src/devtools-remote-tab/components/storage-panel/
  index.tsx                       the panel: reads on mount, owns selection and which pane is open
  toolbar.component.tsx           store dropdown, refresh, add, filter toggle, export, import
  filter-bar.component.tsx        search + modes, invert, clear, scope, more, types
  more-filters-menu.component.tsx group by namespace, hide empty, JSON only
  summary.component.tsx           store line and notes
  status-bar.component.tsx        counts, total size, largest key
  empty-state.component.tsx       devtools off / no stores, with the snippet
  entry-grid.component.tsx        header, sort, groups, empty text
  entry-row.component.tsx         one row, marked matches, right-click menu
  entry-menu.component.tsx        copies (+ Delete in the pane)
  key-detail/index.tsx            tabs, key name, search, ⋮, delete confirm
  key-detail/value-tab.component.tsx
  key-detail/raw-tab.component.tsx
  key-detail/edit-tab.component.tsx
  key-detail/info-tab.component.tsx
  add-key-pane.component.tsx
  import-pane.component.tsx
  search-field.component.tsx      the filter box and its modes, in the bar and in the key pane
  storage-panel-css.const.ts      the few rules Network's CSS has no class for
```

Reused from `network-panel/` as they are: `SyncedInput`, `Checkbox`, `SplitResizer`,
`ColumnResizer`, `JsonTree` (whose `matcher` the console work added), and the `.axonpack-net-*`
classes from `NETWORK_PANEL_CSS`, which the panel gets by wrapping itself in `.axonpack-net`.
`HighlightedText` comes from `console-panel/`. Every one of them is now needed by two panels, which
is the rule for promoting them out of a panel's folder; that is for whoever owns those folders.

**The CSS lives in the panel's folder**, not `constants/`, because this work was kept to the one
folder. Move it with the shared components above if they are promoted.

## Order of work

1. **Panel shell.** Replace the placeholder, read on mount, both empty states, the toolbar's store
   dropdown and Refresh, the summary. Ends with: switching stores and refreshing in DevTools, with
   the device's summary lines.
2. **The table.** Columns, sort from the headers, marked matches, error rows, group by namespace,
   empty text, status bar. Ends with: the same rows in the same order as the device for any sort.
3. **The filter bar.** Search and modes, invert, clear, scope, types with counts, More. Ends with:
   every filter combination giving the device's count.
4. **Row menu.** The four copies on right-click, onto the computer's clipboard. Ends with: each copy
   pasting what the device copies.
5. **Key pane, read side.** Split pane, Value (tree and text), Raw, Info, the pane search, the ⋮
   copy items. Ends with: every value kind drawn as the device draws it, including binary and a
   failed read.
6. **Edit and delete.** Edit tab with its three refusals, notes, JSON warning, Revert/Save, and the
   inline delete confirm. Ends with: an edit and a delete in DevTools showing on the device at once.
7. **Add key.** The pane form with typed values and the refusal of an existing key. Ends with: a key
   added in DevTools for each type the store takes.
8. **Export and import.** Export link, import pane with the plan and the result. Ends with: a file
   exported from the device imported through DevTools, and the other way round.
9. **Parity pass.** Walk the business flow above against the device with four stores registered
   (the example app has AsyncStorage, MMKV, SecureStore and a `Map`). Then ship: the lines move to
   `react-native-devtools.md`, and this plan moves to `logs/`.

## Not in this plan

- **Anything the device tab does not do**: live updates, paging past the cap, hex for binary,
  write history. They are open in `storage.md`, and each one lands on both surfaces when it lands.
- **Clear all / wipe a store.** Won't do, on either surface.
- **Reading a file from the computer for import.** A file's contents cannot cross to the app.
- **Virtualising the table.** Waits for `virtual-list-plan.md`; the default cap is fine without it.
