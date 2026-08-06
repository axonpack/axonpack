# @axonpack/expo-devtools

On-device, production-safe network inspector for React Native and Expo apps — a familiar,
browser-devtools-style Network tab that lives inside your app, no desktop tooling required.

[![npm version](https://img.shields.io/npm/v/@axonpack/expo-devtools.svg)](https://www.npmjs.com/package/@axonpack/expo-devtools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../../LICENSE)

## Features

- **Drop-in overlay** — `<DevtoolsOverlay />` is a draggable FAB that opens a full Network tab on
  tap. No native code, no separate desktop app.
- **Three capture sources feeding one log**: patches Expo's native `fetch`, `XMLHttpRequest`
  (catches most third-party HTTP client libraries, since their RN adapter is typically built on
  XHR), and `<WebView>` traffic via an injected script relayed over `postMessage` — a WebView runs
  in its own JS engine that the other two patches can't see into.
- **Prod-safe by default** — nothing is patched and nothing is recorded until you call `.init()`.
  Skip calling it (or pass `enabled: false`) in production and the library is a complete no-op.
- Browser-devtools-familiar UI: search/filter (method, type, source), a tap-to-filter activity
  histogram, Preserve Log, Copy as cURL, and a "Try in sandbox" request playground seeded from any
  captured entry.
- Full, untruncated request/response bodies — everything is `selectable` and copyable on-device.
  No native fetch/XHR timing waterfall exists to fabricate (see [`ROADMAP.md`](./ROADMAP.md) for
  the platform limits this is built around, and what's still on the table).

## Installation

```sh
npx expo install @axonpack/expo-devtools react-native-safe-area-context react-native-webview
```

`react-native-safe-area-context` and `react-native-webview` are peer dependencies — the overlay
and its response preview rely on them directly.

## Quick start

```tsx
// devtools.ts — one shared instance for your app
import { createDevtoolsClient } from '@axonpack/expo-devtools';

export const devtools = createDevtoolsClient({
  network: {
    includeFetch: true,
    includeXmlHttpRequest: true,
    webviewSources: ['my-webview'],
  },
});
```

```tsx
// index.ts — call once at app startup
import { registerRootComponent } from 'expo';
import App from './App';
import { devtools } from './devtools';

devtools.init();
registerRootComponent(App);
```

```tsx
// App.tsx — mount the overlay anywhere in your tree
import { DevtoolsOverlay } from '@axonpack/expo-devtools';

export default function App() {
  return (
    <>
      <YourApp />
      <DevtoolsOverlay />
    </>
  );
}
```

That's it — fetch, XHR (and therefore most XHR-based HTTP client libraries), and any WebView
tagged with a name from `webviewSources` all show up in the same Network tab.

## Capturing traffic inside a `<WebView>`

A `<WebView>` is a separate JS engine, invisible to the fetch/XHR patches above. Wire it up
explicitly with the injected script and message handler:

```tsx
import { WebView } from 'react-native-webview';
import { devtools } from './devtools';

<WebView
  ref={devtools.getWebViewRef('my-webview')}
  userAgent={devtools.getWebViewUserAgent()}
  source={{ uri: 'https://example.com' }}
  injectedJavaScriptBeforeContentLoaded={devtools.getWebViewInjectedJavaScriptBeforeContentLoaded(
    'my-webview'
  )}
  onShouldStartLoadWithRequest={devtools.shouldAllowWebViewRequest}
  onMessage={(event) => devtools.handleWebViewMessage(event)}
/>;
```

The script goes on `injectedJavaScriptBeforeContentLoaded`, not `injectedJavaScript` — the latter
runs at document-end, after the page's own scripts have already fired their requests, so those
escape both logging and throttling.

The other three props are only needed for network conditions (throttling / user-agent override):
`ref` opens a channel to push a live throttle change into an already-loaded page, `userAgent`
applies the override to the real HTTP header, and `onShouldStartLoadWithRequest` blocks navigation
while Offline is selected. Note that a WebView can never be **fully** throttled from JS — only
requests page JS makes via `fetch`/XHR/`sendBeacon` are interceptable, so subresources the
WebView's native loader issues (`<img>`, `<script src>`, stylesheets, fonts, media) still go out.

`"my-webview"` must be one of the names declared in `webviewSources` — this is enforced both at
compile time (a TypeScript `const` type parameter) and at runtime (an allowlist filter), so a typo
here is caught before it silently drops messages.

## Configuration reference

`createDevtoolsClient(config?)`:

| Option                          | Type       | Default     | Description                                                                                |
| ------------------------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------ |
| `enabled`                       | `boolean`  | `true`      | Master switch. `false` makes `.init()` a no-op — no patching, no capture, no store writes. |
| `network.includeFetch`          | `boolean`  | `true`      | Patch `globalThis.fetch`.                                                                  |
| `network.includeXmlHttpRequest` | `boolean`  | `true`      | Patch `XMLHttpRequest` (covers XHR-based HTTP client libraries and raw XHR usage).         |
| `network.webviewSources`        | `string[]` | `undefined` | Allowlist of WebView names permitted to report traffic into the shared log.                |

## Example app

`example/` is a runnable Expo app demonstrating native fetch/XHR/third-party HTTP client requests
and WebView capture side by side:

```sh
cd example
bun run start   # Expo Go / dev client
bun run ios     # or: bun run android — full native build
```

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for what's implemented, the hard platform limits this design
works around (e.g. no true timing waterfall for native fetch/XHR), and what's feasible but not yet
built (initiator tracking, a Console tab, a Storage tab, and more).

## Contributing

See the repo-root [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) for setup, coding conventions, and
the commit/PR workflow.

## License

MIT © [Md Asadujjaman](https://github.com/abappi19) — see [`LICENSE`](./LICENSE).
