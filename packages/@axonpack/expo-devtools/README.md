# @axonpack/expo-devtools

Browser-style devtools that live **inside** your React Native or Expo app. Tap a floating button and
you get a **Network** tab and a **Console** tab on the device itself — no desktop debugger, no cable,
no native code.

[![npm version](https://img.shields.io/npm/v/@axonpack/expo-devtools.svg)](https://www.npmjs.com/package/@axonpack/expo-devtools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../../LICENSE)

<table>
  <tr>
    <td><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/network-log.png" width="260" alt="Network tab listing captured requests" /></td>
    <td><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/console-log.png" width="260" alt="Console tab listing captured logs" /></td>
    <td><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/console-repl.png" width="260" alt="Running a JavaScript expression at the console prompt" /></td>
  </tr>
</table>

## Why you'd want it

Debugging on a real device usually means plugging into a laptop, or losing the thing you were trying
to reproduce the moment you reach for a menu. This puts the tools where the bug is:

- **See every request** your app makes — including ones from inside an in-app browser page, and from
  HTTP libraries like axios.
- **See everything your app logs**, with objects you can actually open up and explore.
- **Try things out** — resend any request with different headers or a different body, or type a line
  of JavaScript and see what it returns.
- **Pretend the network is bad** — switch to Slow 3G or go offline without touching your Wi-Fi.
- **Safe to ship** — nothing is captured until you switch it on, so leaving the code in a production
  build costs you nothing.

## Installation

```sh
npx expo install @axonpack/expo-devtools react-native-safe-area-context react-native-webview
```

`react-native-safe-area-context` and `react-native-webview` are peer dependencies — the overlay and
its response previews rely on them.

## Quick start

Three small steps: create a client, start it, mount the button.

```ts
// devtools.ts — one shared instance for your app
import { createDevtoolsClient } from '@axonpack/expo-devtools';

export const devtools = createDevtoolsClient();
```

```ts
// index.ts — start it once, at launch
import { registerRootComponent } from 'expo';
import App from './App';
import { devtools } from './devtools';

devtools.init();
registerRootComponent(App);
```

```tsx
// App.tsx — mount the floating button anywhere in your tree
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

That's everything. Drag the button anywhere on screen, tap it to open the panel, and both tabs are
already recording.

## The Network tab

Every request lands as a row: the method, the status, how long it took, and when. Underneath, the
short name and the full URL, plus badges for the kind of response, where the request came from, and
how big it was. A request still in flight shows an amber **PENDING** so you can tell "waiting" from
"finished".

<table>
  <tr>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/network-filters.png" width="260" alt="Filter panel with type, method and source chips" /></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/network-conditions.png" width="260" alt="Throttling and user agent options" /></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/network-overview.png" width="260" alt="Traffic graph with requests grouped by source" /></td>
  </tr>
  <tr>
    <td>Search, then narrow by type, method, or where it came from.</td>
    <td>Slow the connection down, go offline, or pretend to be another browser.</td>
    <td>A traffic graph over time, with requests grouped by source.</td>
  </tr>
</table>

**Finding one request among hundreds.** Search the text, then narrow with the chips: type
(Fetch/XHR, JS, Img, Media, Other), method, or source. The method and source chips are built from
what you've actually captured, so they only ever offer real options. There's an **Invert** switch for
"everything except this", and extra toggles to hide data URLs or hide failed requests.

**Testing a bad connection.** Pick Slow 3G, Fast 3G, Fast 4G, Offline, or set your own speed and
delay. It applies immediately, to your app's own requests and to in-app browser pages. You can also
pretend to be an iPhone, an Android phone, a desktop browser, or Googlebot. Every captured request
remembers the settings it ran under, so requests from before and after a change stay easy to tell
apart.

**Reading the room.** Turn on the traffic graph to see request volume over time and tap a section to
zoom the list to that moment. Turn on grouping to bundle rows by where they came from, with a count
per group. Or switch to compact rows to fit more on screen.

### Tapping a request

<table>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/request-headers.png" width="260" alt="Response headers, each with its own copy button" /></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/sandbox.png" width="260" alt="Sandbox with editable URL, method, auth and query parameters" /></td>
  </tr>
  <tr>
    <td>Headers, with a one-tap copy button on every value.</td>
    <td>The sandbox: change anything, send it again.</td>
  </tr>
</table>

A panel slides up with everything captured, across a few tabs:

- **Headers** — what was sent and what came back, each value with its own copy button, plus the
  connection settings this request ran under.
- **Payload** — what you sent, as an explorable tree rather than a wall of text.
- **Preview** — the response pretty-printed and colour-coded; images and HTML render as a real
  preview.
- **Response** — the raw body, in full, never cut off.
- **Timing** — when it started and how long it took. It also tells you plainly that a
  DNS/TCP/TLS breakdown isn't available on-device, rather than showing numbers it can't measure.

The **⋮** menu copies the URL, or the whole request as a ready-to-paste **cURL** command or `fetch`
snippet.

**Try in sandbox** opens the request as something you can edit: change the method, the URL, the
query parameters, headers, cookies, auth, or the body, then Send and watch the real response come
back. Handy for "does this break if the token is missing?" without touching your code.

Prefer to look at it later? **Export** shares the currently-filtered list as JSON.

## The Console tab

Everything your app logs, on the device. Warnings sit on a yellow row, errors on a red one, and the
toolbar keeps a running count of each so you can see at a glance whether anything went wrong while
you weren't looking.

<table>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/console-filters.png" width="260" alt="Level filter chips showing live counts" /></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/console-autocomplete.png" width="260" alt="An expanded error stack and name suggestions at the prompt" /></td>
  </tr>
  <tr>
    <td>Filter by level, with a live count on each chip.</td>
    <td>Tap an error for its full stack. The prompt suggests names as you type.</td>
  </tr>
</table>

- Each thing you logged gets its own line, so a message and the object next to it don't run
  together. Objects and arrays start collapsed — tap to open them up, level by level.
- Errors show their message on the row and the **full stack** when you tap it.
- The same message logged over and over becomes **one row with a count**, so a chatty screen doesn't
  bury everything else.
- Filter by level (each chip carries a live count) or by source, or search the text of every message.
- The newest output stays in view automatically, and stops following if you scroll back to read
  something — with a button to jump back to the newest.
- Copy any line with one tap.

### Running an expression

The `>` prompt at the bottom runs JavaScript on the device and shows you what came back. Your typed
command appears with a `›`, the answer with a `‹`, and objects come back as the same explorable tree.
Something that returns a promise shows as pending and fills in when it settles, so
`fetch(...).then((r) => r.json())` works as you'd expect.

- Names are **suggested as you type**, including the members of whatever object you're inside.
- **Tap any command you ran earlier** to load it straight back into the prompt.
- Two built-in helpers let you reach your app's own code in a development build:
  `$modules('auth')` lists the files that are loaded, and `$m('src/stores/auth')` hands you one of
  them.

To reach your own objects by a short, stable name, pass them in:

```ts
createDevtoolsClient({
  console: { context: { store, queryClient } },
});
```

This is worth knowing about: your app's files are bundled as private closures, so nothing can reach
an imported name on its own the way a browser console reaches a page's variables. Anything you want
to poke at by name, hand over in `context`. It's also the only thing that works in a release build,
where the file list above isn't available.

The prompt is **off in release builds** by default, since it runs whatever is typed into it. Turn it
on deliberately with `console: { repl: true }` if you want it there.

## Showing your own app in the header

By default the panel header carries this package's name. Point it at your own app instead:

```ts
export const devtools = createDevtoolsClient({
  name: 'Acme Delivery',
  icon: require('./assets/icon.png'),
});
```

Either field works on its own — pass just a name and you keep the default mark, pass just an icon and
you keep the default title.

Both have to be given explicitly. An app's installed launcher icon isn't reachable from JavaScript on
iOS or Android, and the `icon` in your Expo config is a build-time path rather than something `Image`
can load in a standalone build — so there's nothing dependable to detect. Passing the same
`require(...)` your config uses is the one approach that works in every build.

## The Performance tab

Live metrics on the device, no desktop profiler and no cable.

- **JS heap** — how much the JavaScript engine has allocated, with a sparkline of the last two
  minutes so you can watch it climb while you use the app.
- **JS thread FPS** — measured from a frame-delta loop, green at 50+, amber under that, red under 30.
- **Startup** — the launch phases the platform reported: native init, runtime setup, bundle eval, and
  the total.
- **Long tasks** — anything that blocked the JS thread past the threshold (50 ms by default), newest
  first, with when it happened and for how long. A "long task" is one stretch of JavaScript that ran
  without yielding, so nothing else on that thread could happen meanwhile: no touches, no timers, no
  animation driven from JS. At 60 fps a frame is 16.7 ms, so 50 ms is about three frames lost and
  roughly where a tap starts to feel late; past ~200 ms it reads as a freeze. Tasks from before you
  opened the panel are included, which is usually where the startup ones show up.

- **User timing** — every `performance.mark()` and `performance.measure()` your own code makes. This
  is the one metric here that can name the code responsible for a slow stretch, so it's the answer to
  a long task you can't explain:

  ```ts
  performance.mark('checkout:start');
  await buildCart();
  performance.measure('checkout', 'checkout:start');
  ```

  Marks from before you opened the panel are included — the native timeline is read on startup, not
  just watched from then on.

- **Interactions** — anything that took longer than 100 ms from the event to the next paint. Each row
  also shows how long your handler itself held the JS thread: a small handler under a large total
  means the interaction was stuck behind something else rather than being slow itself.

The three lists share one view — pick which with the chips, since only one of them is ever the
question you're asking. Recording works like the other tabs: a record button pauses and resumes, and
a bin clears what's been collected.

### What it deliberately doesn't show

This tab is honest about the difference between what JavaScript can see and what you probably want to
know:

- **App memory is not JS heap.** "Memory" usually means the process footprint (RSS). That needs
  native code — `task_vm_info` on iOS, `Debug.MemoryInfo` on Android — so it isn't here. The JS heap
  is a real number, just a smaller one than you might assume.
- **No "% of heap limit" gauge.** Hermes doesn't report a heap-size limit, so the denominator would
  have to be invented.
- **FPS is the JS thread only.** A janky native scroll or a heavy layout happens on the UI thread,
  which a JavaScript loop is structurally blind to. A green number here does not prove the app feels
  smooth.
- **No heap snapshots or flame charts.** Those come from the CDP `HeapProfiler`/`Profiler` domains
  over the inspector socket, driven from outside the app, and a multi-megabyte snapshot isn't
  something you'd browse on a phone anyway.
- **Some metrics depend on the platform.** Long tasks and startup markers only appear if the native
  side implements them, which varies by platform and React Native version. When they're missing the
  tab says so rather than showing zeros.
- **Long tasks name no culprit.** React Native's `PerformanceLongTaskTiming` returns a permanently
  empty `attribution` array — the web API's mechanism for reporting which code was responsible — so a
  row can tell you a task blocked the thread for 180 ms starting 2.3 s after launch, but never that it
  was your list render. Use it to find _when_ to look, then correlate against what the app was doing;
  it won't point at a function for you.

## Capturing inside an in-app browser

A `<WebView>` runs its own separate JavaScript, invisible to everything above, so it needs two props
wired up:

```tsx
import { WebView } from 'react-native-webview';
import { devtools } from './devtools';

<WebView
  source={{ uri: 'https://example.com' }}
  injectedJavaScriptBeforeContentLoaded={devtools.getWebViewInjectedJavaScriptBeforeContentLoaded(
    'my-webview'
  )}
  onMessage={(event) => devtools.handleWebViewMessage(event)}
/>;
```

Declare the name up front so a typo can't silently swallow everything:

```ts
export const devtools = createDevtoolsClient({
  webviewSources: ['my-webview'],
});
```

That covers both the page's **requests and its console output** — rows show up tagged
`WebView::[my-webview]` in either tab, and the Source chips can filter them apart from your app's
own. TypeScript will reject a name you didn't declare.

Use `injectedJavaScriptBeforeContentLoaded`, not `injectedJavaScript`: the latter runs after the
page's own scripts have already fired, so their requests escape.

Two optional extras, only needed if you want throttling to reach the page too: `ref={devtools.getWebViewRef('my-webview')}`
lets a speed change reach an already-open page, `userAgent={devtools.getWebViewUserAgent()}` applies
the browser override for real, and `onShouldStartLoadWithRequest={devtools.shouldAllowWebViewRequest}`
blocks navigation while Offline is on. Note a page can never be _fully_ throttled — images,
stylesheets and scripts the browser loads by itself still go out at full speed.

## Configuration reference

`createDevtoolsClient(config?)` — every option is optional, and the defaults are what most apps
want.

| Option                               | Type                      | Default     | Description                                                                          |
| ------------------------------------ | ------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `name`                               | `string`                  | `undefined` | Your app's name, shown in the panel header instead of this package's.                |
| `icon`                               | `ImageSourcePropType`     | `undefined` | Your app's icon, e.g. `require('./assets/icon.png')`.                                |
| `webviewSources`                     | `string[]`                | `undefined` | Names of in-app browser views allowed to report in, for both tabs.                   |
| `network.includeFetch`               | `boolean`                 | `true`      | Capture requests made with `fetch`.                                                  |
| `network.includeXmlHttpRequest`      | `boolean`                 | `true`      | Capture `XMLHttpRequest` — this is what catches axios and most other HTTP libraries. |
| `network.disabledByDefault`          | `boolean`                 | `false`     | Open the Network tab not recording. The record button in its toolbar starts capture. |
| `console.capture`                    | `boolean`                 | `true`      | Mirror `console.*` into the Console tab, including from declared browser views.      |
| `console.repl`                       | `boolean`                 | `__DEV__`   | Show the `>` prompt. Off in release builds unless you ask for it.                    |
| `console.context`                    | `Record<string, unknown>` | `undefined` | Extra names an expression can use, e.g. `{ store, queryClient }`.                    |
| `console.disabledByDefault`          | `boolean`                 | `false`     | Open the Console tab not recording. The `>` prompt still works while it's off.       |
| `performance.sampleIntervalMs`       | `number`                  | `1000`      | How often the JS heap is read. Each read crosses into the engine, so keep it coarse. |
| `performance.longTaskThresholdMs`    | `number`                  | `50`        | Only report tasks that blocked the JS thread at least this long.                     |
| `performance.interactionThresholdMs` | `number`                  | `100`       | Only report interactions that took at least this long, event to next paint.          |
| `performance.captureUserTiming`      | `boolean`                 | `true`      | Capture `performance.mark`/`measure` your own code makes.                            |
| `performance.historySize`            | `number`                  | `120`       | How many heap samples and long tasks are kept.                                       |
| `performance.disabledByDefault`      | `boolean`                 | `false`     | Open the Performance tab not recording.                                              |

## Leaving it in production

`.init()` is the only switch that matters. Until it runs, nothing is patched and nothing is
recorded — so shipping the code is safe, and you can decide at runtime:

```ts
devtools.init(); // or: if (__DEV__) devtools.init();
```

Guarding the `.init()` call is the whole mechanism — there's no config flag that does it for you.

## Example app

`example/` is a runnable Expo app to try all of this against. Its Requests screen fires `fetch`,
`XMLHttpRequest`, axios, uploads and an in-app browser page; its Console screen has a button for
every kind of output worth testing — mixed arguments, circular references, class instances, errors,
repeats, and a 600-message flood.

```sh
cd example
bun run start   # Expo Go / dev client
bun run ios     # or: bun run android — full native build
```

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for what's built, what the platform genuinely can't do (and why
this doesn't fake it), and what's still on the table.

## License

MIT © [Md Asadujjaman](https://github.com/abappi19) — see [`LICENSE`](./LICENSE).
