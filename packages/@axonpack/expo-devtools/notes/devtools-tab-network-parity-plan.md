# DevTools tab network parity plan

The Network panel in React Native DevTools is meant to match the on-device Network tab feature for
feature. A check on 2026-09-24 found six things the device has and the DevTools tab does not. This
plan closes them. The device side is done in every case, so the work is drawing it in the tab.

## Business flow

- [ ] From a request's menu in DevTools, choose Override response, set a status, a content type and
      a body, and every matching request from the app gets that answer.
- [ ] An overridden URL can be edited again or removed from the same place.
- [ ] From a request in DevTools, open it in the sandbox, change the method, URL, query, headers,
      cookies, auth or body, send it for real from the device, and read the response.
- [ ] Set a custom download speed, upload speed and latency when the throttle is Custom.
- [ ] Pick a user agent preset, or type one, and the app's requests use it.
- [ ] Turn on stacked header values, and the Headers tab puts a long value under its name.
- [ ] A binary response shows its bytes as a hex dump.
- [ ] Whatever is changed in DevTools shows on the device the moment it changes, and the other way
      round.

## Reference behaviour

Chrome's Network panel is the model, as it is for the rest of the tab:

- **Override content** in Chrome's row menu is the model for the override editor, and **Block
  request URL** is already matched by the shared menu.
- **Network conditions** in Chrome's drawer is the model for the user agent and custom throttle
  controls.
- Chrome has no sandbox. Firefox's **Edit and Resend** is the nearest thing, and the device's own
  sandbox is what this copies.

Not mirrored:

- **Chrome saves overrides to a folder on disk.** Ours live in the app's memory for the session,
  the same as on the device. There is no disk on the app's side to write to.
- **Chrome overrides headers separately.** The device override sets a status, a content type and a
  body, and the tab offers the same three.
- **The sandbox does not send from the browser.** It sends from the device, so the request goes out
  with the device's network, cookies and conditions. A request sent from the desktop would not be
  the request under test.

## Architecture

### Nothing new on the device side

Every store already exists, and the logic is shared, as the rest of the tab is. Where the device
kept a step inside a component (seeding the override and sandbox drafts, saving an override,
putting a sandbox request back together, laying out a hex dump), it moves to a util both surfaces
call:
`networkOverridesStore`, `networkConditionsStore`, `networkViewStore.settings`, and
`sendSandboxRequest` with the row helpers in `features/network/utils/sandbox.util.ts`. The sandbox
sends through the same patched `fetch` as the app, so what it sends is also a row in the log on
both surfaces. The tab draws controls over these and adds no state of its own that the device would
need to see.

**Anything both surfaces show stays in a store.** That is the repo's rule, and it covers the
overrides, the conditions and the settings. A draft in an open editor is shown by one surface only,
so it can be the editor's own state. See the open decision below.

### Text entry crosses one keystroke at a time

Each keystroke is an event sent to the app, which renders and sends the result back. A controlled
input loses characters that way, which is why `SyncedInput` exists: it stays uncontrolled and only
remounts when the value changes from somewhere else. Every field here uses it.

**Bodies need a multi-line field.** `SyncedInput` renders an `input`. A body editor needs a
`textarea` with the same uncontrolled pattern, so `SyncedInput` gains a `multiline` option rather
than a second component. A large JSON body makes every keystroke one op each way, which is cheap,
but a formatted pretty-print on each keystroke would not be. Format on demand only, the way the
device's override editor does.

### Where the editors open

The tab has no bottom sheet and no modal: a tab is its own React root, and nothing is raised above
it. So the override editor and the sandbox open **in the request pane**, in place of the detail
tabs, with a way back. That is also where Chrome puts request detail, so it is where a developer
already looks.

- `request-detail/override-pane.component.tsx`: status, content type, body, Save, Remove.
- `request-detail/sandbox/`: its own folder, since it has several parts, following
  `features/network/components/sandbox/`. Method, URL bar, request tabs (query, headers, cookies,
  auth, body), Send, and the response.
- `entry-menu.component.tsx` gets "Override response…" and "Try in sandbox" back. Today it
  leaves them out because there was no editor to open.

### Settings

- **User agent**: a `select` of the presets and, for Custom, a `SyncedInput`. Writes
  `networkConditionsStore`, so the device's selector moves with it.
- **Custom throttle**: three number fields in the settings pane, always shown, since they are what
  Custom means. Chrome edits its throttling profiles in settings too. The same store and the same
  parsing as the device's `ThrottleSelector`.
- **Stack header values**: a checkbox in the settings pane, read by the tab's Headers tab. It is
  the tab's own setting, `devtoolsStackedHeaders`, beside `devtoolsBigRows` and for the same reason:
  the device picks its default from the screen width and keeps it in the view, and a desktop has
  the room to put a value beside its name.

### Hex dump

`HexView` is a React Native component and the tab is written in DOM, for the reasons in
[react-native-devtools.md](./react-native-devtools.md). The formatting moves to
`core/utils/hex-dump.util.ts` (the rows, the hex bytes, the printable column and the row cap), used
by both `HexView` and a DOM `pre` in the tab's Response tab. Two views, one implementation.

**Keep the row cap.** `HexView` stops at 512 rows so a large binary does not lay out thousands of
rows. In the tab those rows would also cross the bridge as ops, so the cap matters more here.

## Order of work

1. [x] **Correct the notes.** `react-native-devtools.md` marks throttling, the user agent, overrides
       and the sandbox as done, and says a binary body gets a hex dump. Ends with: its checklist
       saying what is actually there.
2. [x] **Settings.** User agent, custom throttle and stacked headers. Ends with: each one changed in
       DevTools and seen changed on the device.
3. [x] **Hex dump.** Move the formatting to the shared util, then draw it in the tab. Ends with: an
       image response showing the same dump on both surfaces.
4. [x] **Multi-line `SyncedInput`.** Ends with: a long body typed quickly with no lost characters.
5. [x] **Override editor.** Ends with: an override set in DevTools answering the app's next request,
       and removable from either surface.
6. [x] **Sandbox.** Ends with: a captured request edited in DevTools, sent from the device, with its
       response shown and its row in the log on both surfaces.
7. [ ] **Shipped.** The lines move to `react-native-devtools.md` as done, this plan moves to
       `logs/`, and a changeset for `@axonpack/expo-devtools`.

## Not in this plan

- **Dragging a range across the overview strip.** It needs measurements, and none reach the app.
  It is already in Won't do.
- **Saving a body to a file from the browser.** The menu's copies and its share go through the app,
  so they land on the device. A real browser download needs a real element, which a tab does not
  have.
- **Sandbox history.** The device has none, and a second surface is not the place to add it.

## Open decisions

- **Draft state for the editors: the editor's own, or a store?** A store would let a sandbox opened
  in DevTools show the same half-edited request on the device. Nobody edits one request on two
  screens at once, and a store would mean every keystroke on one surface redraws the other.
  **Recommended: the editor's own state**, with only the saved override and the sent request going
  to the stores. If that is chosen, CONVENTIONS.md's store rule should say that a draft is exempt.
- **Can the sandbox and the detail pane both be open?** The device shows one sheet at a time.
  Recommended: the same here. The sandbox replaces the detail tabs, and closing it returns to them.
