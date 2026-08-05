# @bruin/devtools

On-device, production-safe network inspector for React Native and Expo apps — a Chrome
DevTools-style Network tab that lives inside your app, no desktop tooling required.

[![npm version](https://img.shields.io/npm/v/@bruin/devtools.svg)](https://www.npmjs.com/package/@bruin/devtools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../../LICENSE)

## Features

- **Drop-in overlay** — `<DevtoolsOverlay />` is a draggable FAB that opens a full Network tab on
  tap. No native code, no separate desktop app.
- **Three capture sources feeding one log**: patches Expo's native `fetch`, `XMLHttpRequest`
  (catches axios, since its RN adapter uses XHR), and `<WebView>` traffic via an injected script
  relayed over `postMessage` — a WebView runs in its own JS engine that the other two patches
  can't see into.
- **Prod-safe by default** — nothing is patched and nothing is recorded until you call `.init()`.
  Skip calling it (or pass `enabled: false`) in production and the library is a complete no-op.
- Chrome DevTools-familiar UI: search/filter (method, type, source), a tap-to-filter activity
  histogram, Preserve Log, Copy as cURL, and a "Try in sandbox" request playground seeded from any
  captured entry.
- Full, untruncated request/response bodies — everything is `selectable` and copyable on-device.
  No native fetch/XHR timing waterfall exists to fabricate (see [`ROADMAP.md`](./ROADMAP.md) for
  the platform limits this is built around, and what's still on the table).

## Installation

```sh
npx expo install @bruin/devtools react-native-safe-area-context react-native-webview
```

`react-native-safe-area-context` and `react-native-webview` are peer dependencies — the overlay
and its response preview rely on them directly.

## Quick start

```tsx
// devtools.ts — one shared instance for your app
import { createDevtoolsClient } from '@bruin/devtools';

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
import { DevtoolsOverlay } from '@bruin/devtools';

export default function App() {
  return (
    <>
      <YourApp />
      <DevtoolsOverlay />
    </>
  );
}
```

That's it — fetch, XHR (and therefore axios), and any WebView tagged with a name from
`webviewSources` all show up in the same Network tab.

## Capturing traffic inside a `<WebView>`

A `<WebView>` is a separate JS engine, invisible to the fetch/XHR patches above. Wire it up
explicitly with the injected script and message handler:

```tsx
import { WebView } from 'react-native-webview';
import { devtools } from './devtools';

<WebView
  source={{ uri: 'https://example.com' }}
  injectedJavaScript={devtools.getWebViewInjectedScript('my-webview')}
  onMessage={(event) => devtools.handleWebViewMessage(event)}
/>;
```

`"my-webview"` must be one of the names declared in `webviewSources` — this is enforced both at
compile time (a TypeScript `const` type parameter) and at runtime (an allowlist filter), so a typo
here is caught before it silently drops messages.

## Configuration reference

`createDevtoolsClient(config?)`:

| Option                          | Type       | Default     | Description                                                                                |
| ------------------------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------ |
| `enabled`                       | `boolean`  | `true`      | Master switch. `false` makes `.init()` a no-op — no patching, no capture, no store writes. |
| `network.includeFetch`          | `boolean`  | `true`      | Patch `globalThis.fetch`.                                                                  |
| `network.includeXmlHttpRequest` | `boolean`  | `true`      | Patch `XMLHttpRequest` (covers axios and raw XHR usage).                                   |
| `network.webviewSources`        | `string[]` | `undefined` | Allowlist of WebView names permitted to report traffic into the shared log.                |

## Example app

`example/` is a runnable Expo app demonstrating native fetch/XHR/axios requests and WebView
capture side by side:

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
