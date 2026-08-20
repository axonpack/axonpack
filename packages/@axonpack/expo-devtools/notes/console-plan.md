# Console tab — implementation plan

Planning-only doc for a browser-devtools-style Console tab, built the same way `NetworkView` was.

## Business flow

How a developer actually experiences this feature, end to end.

- [ ] Developer calls `console.log/info/warn/error/debug` normally in app code — no new API to learn, nothing to change at call sites
- [ ] `createDevtoolsClient(...).init()` patches `console` at app startup, so every call also feeds the on-device log alongside its normal Metro/terminal output
- [ ] Developer opens the existing draggable DEV FAB (`DevtoolsOverlay`) — the same modal that already hosts the Network tab
- [ ] Developer taps the new Console tab, switched via `DevtoolsTabBar`, and sees a live-updating log list — no reload needed
- [ ] Developer filters by level (chips) or searches text to zero in on the log they care about
- [ ] Developer taps a Source chip (Native / a named WebView) to see only that context's messages — same chip pattern Network already uses for its Source filter
- [ ] Developer taps a row to expand object/array args inline for inspection
- [ ] Clear button or `console.clear()` resets the panel; Pause stops recording new entries without affecting the app's own console/Metro output
- [ ] Production builds stay silent by default — capture only starts if `.init()` runs, same prod-safe default Network already has

## Reference behaviour

Chrome DevTools' Console tab is the model, same as Network was modeled on Chrome's Network tab.

- [ ] Every `console.log/info/warn/error/debug` call becomes a row, oldest-to-newest, timestamped
- [ ] Level-colored rows (error = red, warning = yellow/amber, info/log = default, debug = muted)
- [ ] Consecutive identical messages collapse into one row with a repeat-count badge (`×3`) instead of three rows
- [ ] Objects/arrays render as an inspectable, collapsible tree, not `[object Object]`
- [ ] `console.group`/`console.groupEnd` nests and indents subsequent rows until the matching `groupEnd`; `console.groupCollapsed` starts that group collapsed
- [ ] `console.count(label)` / `console.countReset(label)` tracks a named counter and logs `label: N` on each call
- [ ] printf-style substitution: `console.log('%s is %d', name, age)` substitutes into the message instead of printing literal `%s`/`%d` tokens
- [ ] Toolbar: Clear, level filter (chips), text search
- [ ] `console.clear()` clears the panel, not just a UI-only Clear button
- [ ] Context selector — Chrome's "top" frame dropdown, analog is our Source chips (Native / named WebView), reusing the same pattern Network's Source filter already established rather than inventing a second control
- [ ] Live counts next to each level chip (e.g. "Errors (12)") — our lightweight analog of Chrome's left-hand message-count sidebar, computed the same way `NetworkView` already derives its `sources`/`methods` chip lists from the current snapshot

### Chrome features intentionally not mirrored

- [ ] "Network messages" / "Log XMLHttpRequests" / "CORS errors in console" checkboxes — redundant here; the dedicated Network tab already covers request/response detail far beyond what console-embedded network logging shows in Chrome
- [ ] "Selected context only" checkbox — not needed as a separate control; tapping a Source chip already narrows the list to just that context, same as any other filter chip
- [ ] Eager evaluation / Autocomplete from history / Treat code evaluation as user action / the `>` input line itself — all about Chrome's REPL, which evaluates arbitrary JS against the page. There's no code-evaluation sandbox planned for Console (Network's Sandbox tab is a different thing — it replays HTTP requests, not arbitrary JS)
- [ ] The global Issues panel and its badge count — a browser-wide DevTools feature unrelated to a single console

## Architecture

Mirrors the Network tab's three-layer shape: `services/console/patch-console.service.ts` → `stores/console/console-log.store.ts` → `components/console/*`. WebView console capture adds a second, optional source into the same store — see its own subsection below.

### Store — `stores/console/console-log.store.ts`

Same shape as `stores/network/network-log.store.ts`.

- [ ] Module-level `entries` array, ring buffer, `expo`'s `EventEmitter` for pub/sub
- [ ] `enabled`/`paused` flags gated the same way — disabled until `createDevtoolsClient(...).init()` runs
- [ ] Entry fields: `id`, `level` (`log`/`info`/`warn`/`error`/`debug`), `args` (raw, formatted lazily at render time), `message` (pre-formatted summary for search), `count` (repeat-collapse counter), `groupDepth`, `timestamp`, `source?` (`'native'` default, or a named WebView — mirrors `NetworkLogEntry.source`)
- [ ] `MAX_ENTRIES`: propose 500, not Network's 200 — console output is chattier and entries are lighter-weight
- [ ] Repeat-collapse: `add()` compares the incoming entry's level + message + groupDepth + source against only the _last_ stored entry (O(1), not a scan of the whole buffer) — if equal, bump that entry's count and re-emit instead of unshifting a new one
- [ ] Collapsing is always-on, not a user setting — no "group similar logs" toggle. A toggle would mean two render paths (one collapsed row with a badge vs. N individual rows), and reconstructing N identical rows from a single counted entry is wasted complexity for zero real benefit — count-only display, no recursive/exploded rendering, ever. Chrome's own "Group similar messages" checkbox defaults to on anyway — our always-on behavior matches Chrome's default, we just don't expose the off-switch
- [ ] Because collapsing only ever compares against the immediately preceding entry, non-consecutive repeats (same message logged again after something else interleaves) correctly stay as separate rows — matches Chrome's own behavior, not a simplification we're choosing
- [ ] Including `source` in the repeat-collapse comparison keeps native and WebView messages from collapsing into each other just because their text happens to match
- [ ] `clear()` — same as network's, also called internally when the patched `console.clear()` runs
- [ ] `console.clear()` called from inside a WebView clears the whole shared store, not just that WebView's own entries — no per-source clear in v1, same all-or-nothing behavior the toolbar's Clear button has
- [ ] No `notifyNavigation`/`preserveLog` equivalent for v1 — a WebView navigation event already exists for Network's Preserve Log; console could wire into the same `notifyNavigation` call later, but isn't required for the console tab to work

### Service — `services/console/patch-console.service.ts`

Patches the global `console` object the same way `patch-fetch.service.ts`/`patch-xhr.service.ts` patch their globals.

- [ ] Patches `console.log/info/warn/error/debug` and `.group`/`.groupEnd`/`.groupCollapsed`, `.count`/`.countReset`, `.clear`
- [ ] Save a reference to the current method, replace it with a wrapper that records into `consoleLogStore` (tagged `source: 'native'`) and then calls through to the original
- [ ] Calling through to the original keeps terminal/Metro output and RN's own `LogBox` working unchanged
- [ ] No per-level config, unlike Network's `includeFetch`/`includeXmlHttpRequest` toggles — all five levels are always patched, plain no-argument `patchConsole()` function
- [ ] `console.group`/`groupCollapsed` increments a module-level depth counter read by the store's `add()`; `groupEnd` decrements it
- [ ] `groupCollapsed`'s "starts collapsed" behavior is a rendering concern — the store just records depth, the component decides default-collapsed state
- [ ] `console.count`/`countReset` keep their own `Map<string, number>` inside the service and synthesize a `log`-level entry with message `label: n`
- [ ] `console.clear` calls `consoleLogStore.clear()` then the original

### WebView console capture — `services/console/webview-console-logger.service.ts`

Second capture source, same relay pattern `webview-network-logger.service.ts` already uses for fetch/XHR inside a `<WebView>`'s separate JS engine.

- [ ] A `<WebView>` is its own JS engine, invisible to `patch-console.service.ts` the same way it's invisible to `patch-fetch.service.ts`/`patch-xhr.service.ts` — needs its own injected-script + `postMessage` relay
- [ ] Reuses the existing `webviewSources` typed allowlist from `DevtoolsNetworkConfig` rather than adding a second config field — a WebView already declared for network capture gets console capture for free, keeping the "no extra config for console" principle intact
- [ ] `createDevtoolsClient(...).getWebViewInjectedJavaScriptBeforeContentLoaded(source)` concatenates this service's injected script with `webview-network-logger.service.ts`'s, so a consumer still only sets one `injectedJavaScriptBeforeContentLoaded` prop and wires one `onMessage` handler for both
- [ ] `handleWebViewMessage` dispatches by a `type` discriminator (`'network'` vs `'console'`) in the relayed payload; each handler ignores message types it doesn't own
- [ ] The injected script's patched `console.*` calls through to the WebView page's own original `console.*`, same call-through principle as the native patch — a remote debugger attached to the WebView itself still sees normal output
- [ ] Relayed entries are tagged `source: <webview name>` (the same name used for that WebView's Network entries), so Source chips filter both tabs consistently
- [ ] No source-specific ordering — native and WebView entries interleave in one list by `timestamp`, not segregated into separate lists unless a Source chip is active

### Formatting — `utils/console/format-console-arg.util.ts`

Pure formatting, separate from the store, only runs at render time.

- [ ] Primitives → `String(value)`
- [ ] `Error` instances → message + stack (expandable)
- [ ] Objects/arrays → handed to the JSON tree component for an inspectable, collapsible render — not `JSON.stringify`
- [ ] printf substitution (`%s`, `%d`/`%i`, `%o`/`%O`, `%c` consumed-but-ignored, `%%` literal percent) when the first arg is a string containing format specifiers
- [ ] Circular references and huge arrays: reuse the JSON tree's existing safe traversal rather than re-solving it

### Filtering — `utils/console/filter-entries.util.ts`

Same shape as `utils/network/filter-entries.util.ts`'s `matchesQuery`.

- [ ] Matches against `entry.message` + level instead of method/url/status
- [ ] Source filtering itself stays a plain equality check in the component (`entry.source === activeSource`), same as `NetworkView` — no separate util needed for that part

### Visuals — `constants/console/level-visuals.const.ts`

Mirrors `constants/network/resource-type-icons.const.ts`'s pattern.

- [ ] A per-level `{ icon, color, backgroundTint }` map
- [ ] Needs 2 new background-tint tokens in the shared `constants/colors.const.ts` — `consoleErrorTint`/`consoleWarningTint` — since console rows use a light red/yellow row background, not just colored text

### Components — `components/console/`

Composite-only per `CONVENTIONS.md` — `ConsoleView` composes `LogEntryRow`, nothing defined inline.

- [ ] `console-view.component.tsx` — toolbar (Clear, Pause/Resume via the existing `RecordToggleIcon`, Filter panel) + `FlatList` of entries, read via `useSyncExternalStore`
- [ ] Filter panel: search input styled per `INPUT_STYLES.md`; level chips (All/Log/Info/Warn/Error/Debug) reusing `Chip.ui.tsx`, each showing a live count; Source chips (All/Native/named WebViews), same `formatSource` helper Network already uses
- [ ] `log-entry.component.tsx` — one row: level icon/color, timestamp, source badge (only shown once a WebView source exists — hidden entirely for native-only apps), group-depth indentation, repeat-count badge when `count > 1`, formatted message
- [ ] Tap toggles inline expansion for object/array args — accordion, not a slide-up `DetailPanel`, since a console entry has one expandable value rather than Network's multiple tabs of data

### Reuse — promote `json-tree` to a core component

Console becomes its second consumer, which is exactly the trigger `CONVENTIONS.md`'s core-exception carve-out describes.

- [ ] `components/network/detail-panel/json-tree/` is currently feature-scoped under `network/`
- [ ] Move it to `components/json-tree/` (no feature subfolder) and update `detail-panel`'s import path
- [ ] Not a new abstraction — the existing component, relocated

### Overlay wiring

`DevtoolsOverlay` needs its first tab switcher.

- [ ] Today `devtools-overlay.component.tsx` renders `<NetworkView />` directly — no tab bar because there's only ever been one tab
- [ ] New `components/devtools-overlay/devtools-tab-bar.component.tsx`, same idea as `network/sandbox/sandbox-tab-bar.component.tsx`
- [ ] `DevtoolsOverlay` gains `activeTab` state (`'network' | 'console'`) and renders `DevtoolsTabBar` between the header and the tab body
- [ ] Stretch idea: badge an error count on the Console tab label when entries include `level === 'error'` and the panel isn't open

### Client wiring

No new config surface added to `create-devtools-client.client.ts`.

- [ ] `DevtoolsClientConfig` gains nothing beyond what already exists (`enabled`, `network`) — console capture, including WebView console capture, always follows whatever `network.webviewSources` is already declared
- [ ] `init()` calls `patchConsole()` unconditionally alongside the existing `patchFetch`/`patchXHR`, gated by the same top-level `enabled` flag
- [ ] The returned object gains `consoleLogStore` next to the existing `networkLogStore`
- [ ] `index.ts` exports `ConsoleLogEntry`/`ConsoleLogLevel` alongside the existing `NetworkLogEntry`/`NetworkLogStatus`

### Known quirks to watch for

Write these into `notes/README.md` once built.

- [ ] Patch ordering — another tool (Reactotron, Flipper, Sentry) patching `console.*` after ours installs may wrap ours (fine) or replace it outright (capture silently stops); `patchConsole()` should be installed as early as possible
- [ ] `LogBox` interaction — RN's `LogBox` also hooks `console.error`/`console.warn`; because our patch always calls through to the saved original, LogBox keeps functioning
- [ ] Circular/huge objects — a logged object with circular refs or a huge array must not crash the formatter or freeze the list; reuse the JSON tree's existing safe traversal
- [ ] WebView console capture only sees WebViews declared in `webviewSources` — same runtime allowlist drop behavior `handleWebViewNetworkMessage` already has, not a new mechanism
- [ ] One shared `clear()` — clearing from the toolbar or from any single source's `console.clear()` wipes every source's entries, not just that source's

## Implementation plan

Each phase builds on the last; v1 ships after Phase 1.

### Phase 1 — MVP

First usable Console tab, native only.

- [ ] Store: `console-log.store.ts`
- [ ] Patch service (log/info/warn/error/debug only)
- [ ] `ConsoleView` + `LogEntryRow` (level color, timestamp, plain-text message, no object tree yet)
- [ ] Toolbar: Clear + Pause + search filter + level chips
- [ ] `DevtoolsTabBar` wired into `DevtoolsOverlay`
- [ ] Client wiring + `consoleLogStore` export
- [ ] Example app Console demo screen

### Phase 2 — Inspectable values

Objects/arrays stop rendering as flat strings.

- [ ] Promote `json-tree` to core
- [ ] Wire it into `format-console-arg.util.ts` for object/array args
- [ ] printf-style substitution

### Phase 3 — Native + WebView context

Console gains a second capture source and the filtering to match.

- [ ] `source` field on `ConsoleLogEntry`, native calls tagged `'native'`
- [ ] `webview-console-logger.service.ts` — injected script + relay, reusing `webviewSources`
- [ ] `getWebViewInjectedJavaScriptBeforeContentLoaded`/`handleWebViewMessage` combine network + console payloads over one channel
- [ ] Source chips in the Console filter panel (All/Native/named WebViews)
- [ ] Per-level and per-source live counts on the filter chips

### Phase 4 — Grouping & counting

Matches the rest of the real `console` API surface.

- [ ] `console.group`/`groupEnd`/`groupCollapsed` (depth + default-collapsed state)
- [ ] `console.count`/`countReset`
- [ ] Repeat-collapse badge

### Phase 5 — Polish

Small quality-of-life additions once the core loop works.

- [ ] `console.clear()` wired through
- [ ] Copy-value action
- [ ] Console tab error-count badge

### Phase 6 — Stretch

Explicitly out of scope for now.

- [ ] `console.table` rendering
- [ ] Call-site stack traces
- [ ] Per-source `console.clear()` (clearing only one WebView's entries instead of the whole store)
- [ ] "Group similar logs" setting toggle — considered and rejected, not deferred: the store's repeat-collapse (see Store section) is always-on, so a toggle would only add a second, exploded-rows render path for zero real benefit
