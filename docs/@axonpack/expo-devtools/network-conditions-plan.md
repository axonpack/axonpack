# Network conditions — implementation plan

Planning doc for adding throttling and user-agent override to the existing Network tab. Two settings only, both working for native and WebView.

## Business flow

How a developer actually experiences this feature, end to end.

- [x] Developer opens the Network tab's existing Settings panel
- [x] A "Throttling" chip row appears: No throttling (default), Slow 3G, Fast 3G, Fast 4G, Offline, Custom
- [x] Picking Custom reveals Download (kbps) and Latency (ms) inputs
- [x] A "User agent" chip row sits below it: predefined devices/browsers + Custom (reveals a free-text input)
- [x] Both take effect immediately for every subsequent request — no app restart, no re-calling `.init()`
- [x] Requests from native `fetch`, native XHR, and inside a `<WebView>` all obey the same settings
- [x] The Sandbox's Send button inherits the conditions automatically — it fires through the same patched `fetch`
- [x] Switching back to No throttling / Default UA restores normal behavior instantly
- [x] Settings reset on app restart — nothing persists (no storage layer exists yet)

## Reference behaviour

Chrome DevTools' Network conditions drawer, minus everything that has no meaning on mobile.

- [x] Throttle presets: No throttling, Slow 3G, Fast 3G, Fast 4G, Offline, Custom
- [x] Custom throttling: download kbps + added latency ms
- [x] Offline: requests fail immediately with a real network-failure error
- [x] User agent: predefined list (iPhone Safari, Android Chrome, Desktop Chrome, Windows Chrome, Googlebot) + free-text Custom
- [x] Not mirrored — "Disable cache" (RN has no browser HTTP cache to disable), device/viewport emulation, and CPU throttling. All browser-only concepts

## Architecture

New store read by the existing patches. No change to `createDevtoolsClient`'s config surface — these are runtime-toggled from the Settings UI, not init-time config.

### Store — `stores/network/network-conditions.store.ts`

Separate from `network-log.store.ts` — conditions are how requests behave, log entries are what already happened.

- [x] State: selected throttle preset id, custom throttle values, selected user-agent preset id, custom UA string
- [x] `resolve()` returns a memoized `{ offline, throttle, userAgent }` — rebuilt only on change, since it's read on every single request
- [x] `expo` `EventEmitter` pub/sub, same as every other store here
- [x] Read via `useSyncExternalStore` in the UI, read directly (no hook) from the patches

### Constants

- [x] `constants/network/throttle-presets.const.ts` — ids, labels, profiles. Approximations of Chrome's presets, not byte-exact
- [x] `constants/network/user-agent-presets.const.ts` — ids, labels, UA strings

### Throttle math — `utils/network/network-conditions.util.ts`

- [x] `computeThrottleDelayMs(byteSize, profile)` — latency plus transfer time (`bytes × 8 / kbps` lands directly in ms)
- [x] `remainingDelayMs(targetMs, elapsedMs)` — so total wall time _matches_ the simulated target instead of stacking on top of the real request time
- [x] `delay(ms)` — promise sleep

### Native fetch — `patch-fetch.service.ts`

- [x] User agent: merged into the outgoing `init.headers`, replacing any existing casing variant
- [x] Offline: skip the real fetch, reject with a `TypeError('Network request failed')` — the same error shape a genuine failure produces
- [x] Throttle: await the real response, read its body, then wait out the remaining simulated time before resolving

### Native XHR — `patch-xhr.service.ts`

The dispatch-point trick is what makes this work properly.

- [x] User agent: an extra `setRequestHeader` inside the existing `send` patch, before the log entry is recorded so it shows up in the log
- [x] Throttle: patch `XMLHttpRequest.prototype.setReadyState` — RN's own single dispatch point for `readystatechange`/`load`/`error`/`loadend`. Deferring the DONE transition there delays **every** listener at once, with RN's own dispatcher preserving `this` semantics
- [x] Not wrapping individual listeners: RN's `xhr.onload = fn` setters route through the public `addEventListener`, so listener-wrapping would work too — but it would need a WeakMap, a `removeEventListener` patch, and per-listener `this` handling. One `setReadyState` patch replaces all of that
- [x] `setReadyState` is RN-specific, not standard DOM — feature-detected, and XHR throttling is skipped (logging still works) if a runtime doesn't have it
- [x] Offline: call `__didCompleteResponse(requestId, 'Network request failed', false)` without ever sending. RN's own failure path — sets the error flag, moves to DONE, dispatches `error` + `loadend`. Falls back to `abort()` if unavailable

### WebView — `webview-network-logger.service.ts` + `webview-conditions.service.ts`

`injectedJavaScript` only runs once per navigation, so a live conditions change needs a push channel.

- [x] The injected script reads a `window.__axonpackDevtoolsConditions` global, seeded at injection time
- [x] `webview-conditions.service.ts` holds a `source → WebView` registry and pushes an updated global via `injectJavaScript` whenever the store changes
- [x] `devtools.getWebViewRef(source)` returns a **stable, memoized** callback ref — a fresh closure per render would make React detach/reattach the ref every time
- [x] Re-push on every `navigation` message: the seeded snapshot is whatever the _consumer_ last rendered with, and a consumer doesn't re-render on a conditions change — so without this, a page load silently reverts the page to stale settings
- [x] Inject via `injectedJavaScriptBeforeContentLoaded`, not `injectedJavaScript` — the latter runs at document-end, after the page's own scripts have already fired their requests
- [x] Messages queue in an outbox until `window.ReactNativeWebView` exists — injecting early means the bridge may not be up yet (notably on Android), and dropping those would defeat the point of injecting early
- [x] In-page fetch: full offline + latency + bandwidth throttling
- [x] In-page XHR: `send()` delayed by latency; offline dispatches a synthetic `error`/`loadend`. No `setReadyState` equivalent exists in a real browser engine, so bandwidth delay isn't applied there
- [x] `navigator.sendBeacon` patched too — analytics libraries lean on it, so it'd otherwise be steady traffic ignoring Offline
- [x] `shouldAllowWebViewRequest` for `onShouldStartLoadWithRequest` blocks document/iframe navigation while offline, which no in-page patch can do
- [x] User agent: the script overrides `navigator.userAgent` in the page, which covers client-side UA sniffing. The real HTTP header needs `react-native-webview`'s own `userAgent` prop — `devtools.getWebViewUserAgent()` exposes the current value for it

### Components

- [x] `components/network/throttle-selector.component.tsx` — chip row + custom inputs
- [x] `components/network/user-agent-selector.component.tsx` — chip row + custom input
- [x] Both read/write the store directly, so `NetworkView` just composes them — no prop threading
- [x] The Settings panel becomes scrollable with a max height, since it now holds meaningfully more content

### Known limits

Write into `ROADMAP.md`'s hard-limits section.

- [x] Throttling delays when the JS-visible request resolves — it does not shape real bytes on the wire. Good for testing loading states, not a substitute for real-device network testing
- [x] Upload throttling isn't modeled
- [x] No persistence across restarts
- [x] Native UA override is best-effort: RN doesn't enforce the browser's forbidden-header rule, but the native stack (OkHttp / `NSURLSession`) has final say
- [x] WebView in-page XHR gets latency only, not bandwidth
- [x] **A WebView can never be fully throttled or taken offline from JS.** Only requests page JS makes through `fetch`/XHR/`sendBeacon` are interceptable. Everything the WebView's _native_ loader issues goes out regardless: the top-level document, `<img>`/`<script src>`/`<link rel=stylesheet>`, `@font-face`, CSS `url()`, `<video>`/`<audio>`, favicons, `<link rel=preload/prefetch>`, and service-worker traffic. On a content-heavy site that's the majority of requests, so expect plenty to slip past Offline. `onShouldStartLoadWithRequest` only recovers navigations — it doesn't fire for subresources on either platform. Genuinely fixing this needs native request interception (`WKURLSchemeHandler` / `shouldInterceptRequest`), which `react-native-webview` doesn't expose

## Implementation plan

### Phase 1 — Foundation

- [x] `network-conditions.store.ts`
- [x] `throttle-presets.const.ts`
- [x] `user-agent-presets.const.ts`
- [x] `network-conditions.util.ts`

### Phase 2 — Native

- [x] `patch-fetch.service.ts` — UA, offline, throttle
- [x] `patch-xhr.service.ts` — UA, offline, `setReadyState` throttle

### Phase 3 — WebView

- [x] `webview-conditions.service.ts` — registry + live push
- [x] Injected-script throttle + `navigator.userAgent` override
- [x] `getWebViewRef` / `getWebViewUserAgent` on the client

### Phase 4 — UI

- [x] `throttle-selector.component.tsx`
- [x] `user-agent-selector.component.tsx`
- [x] Wired into the Network Settings panel, made scrollable
- [x] Client + `index.ts` exports
- [x] Example app wiring

### Phase 5 — Stretch

Not built.

- [ ] Persistence once `@axonpack/lite-storage` exists
- [ ] Upload-speed modeling
- [ ] Bandwidth throttling for in-page WebView XHR
