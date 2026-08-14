<div align="center">

<img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/logo.png" width="88" alt="Axonpack" />

# @axonpack/expo-devtools

**Browser-style devtools that live inside your React Native or Expo app.**

Tap a floating button for three tabs on the device itself: **Network** (every request, resendable, with
throttling), **Console** (every log, plus a prompt that answers) and **Performance** (frame rate, memory,
the moments the app froze). No desktop debugger, no cable, and nothing captured until you switch it on.

[![npm version](https://img.shields.io/npm/v/@axonpack/expo-devtools.svg)](https://www.npmjs.com/package/@axonpack/expo-devtools)
[![npm downloads](https://img.shields.io/npm/dm/@axonpack/expo-devtools.svg)](https://www.npmjs.com/package/@axonpack/expo-devtools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/axonpack/axonpack/blob/main/LICENSE)

<table>
  <tr>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/network-log.png" width="260" alt="Network tab listing captured requests" /></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/console-log.png" width="260" alt="Console tab listing captured logs" /></td>
    <td width="33%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/perf-statistics.png" width="260" alt="Performance tab showing frame rate and memory charts" /></td>
  </tr>
  <tr>
    <td>Every request as it happens, in-app browser traffic included.</td>
    <td>Every log, with objects you can open up and explore.</td>
    <td>Frame rate, memory and startup, measured on the device.</td>
  </tr>
</table>

</div>

## Installation

```sh
npx expo install @axonpack/expo-devtools react-native-safe-area-context react-native-webview
```

`react-native-safe-area-context` and `react-native-webview` are peer dependencies. The overlay and its
response previews rely on them.

## Quick start

Two things have to happen: `init()` runs **once at startup**, and `<DevtoolsOverlay />` is mounted **once
at the root**. Nothing else: no config plugin, no `app.json` changes, no native code to write.

**1. Create the client.** One shared instance the rest of your app imports, plus one flag deciding whether
it runs at all:

```ts
// devtools.ts
import { createDevtoolsClient } from '@axonpack/expo-devtools';

export const DEVTOOLS_ENABLED = process.env.EXPO_PUBLIC_APP_ENV !== 'prod';

export const devtools = createDevtoolsClient();
```

Set `EXPO_PUBLIC_APP_ENV=prod` for your production builds (in `eas.json`, or a `.env` file) and leave it
unset everywhere else. Use `__DEV__` instead if a dev/release split is all you need.

**2. Wire it up.** Copy whichever matches your app. You only need one of these.

<details open>
<summary><b>Expo Router</b> (the default in a new Expo app)</summary>

The root layout is the place. `devtools.init()` goes at **module scope**, outside the component, so the
`fetch`/`console` patches are installed before the first screen renders.

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { DevtoolsOverlay } from '@axonpack/expo-devtools';
import { devtools, DEVTOOLS_ENABLED } from '../devtools';

if (DEVTOOLS_ENABLED) devtools.init();

export default function RootLayout() {
  return (
    <>
      <Stack />
      {DEVTOOLS_ENABLED && <DevtoolsOverlay />}
    </>
  );
}
```

</details>

<details open>
<summary><b>Your own entry point</b> (<code>registerRootComponent</code>)</summary>

`init()` goes in the entry file, before the app is registered. The overlay goes in your root component.

```ts
// index.ts
import { registerRootComponent } from 'expo';
import App from './App';
import { devtools, DEVTOOLS_ENABLED } from './devtools';

if (DEVTOOLS_ENABLED) devtools.init();
registerRootComponent(App);
```

```tsx
// App.tsx
import { DevtoolsOverlay } from '@axonpack/expo-devtools';
import { DEVTOOLS_ENABLED } from './devtools';

export default function App() {
  return (
    <>
      <YourApp />
      {DEVTOOLS_ENABLED && <DevtoolsOverlay />}
    </>
  );
}
```

</details>

That's it. Drag the button anywhere on screen, tap it to open the panel, and the Network and Console tabs
are already recording. The panel reopens on whichever tab you last had open, for as long as the app is
running.

A few things that trip people up:

- **Mount the overlay exactly once.** The root is the place to do it, because one mount there covers every
  route: the panel opens as a modal on top of whichever screen is showing, so nested Tabs and Drawer
  layouts are already covered and must not mount their own. A second mount gives you a second button.
- **`init()` runs exactly once too,** at module scope rather than in a `useEffect`. Anything that fires
  before an effect would run, such as requests during module evaluation or logs at import time, is missed
  otherwise.
- **Performance starts paused.** Measuring isn't free, so press its record button when you want it. The
  other two tabs record from launch.
- **Expo Go works.** A handful of readings come from this package's native module and go quiet there:
  main-thread frame rate, app and device memory, storage, and the main-thread Limiter. Everything else,
  including all of Network and Console, behaves the same. Use a development build for the full set.
- **In-app browser pages need two extra props** on the `<WebView>` itself. See
  [Capturing inside an in-app browser](#capturing-inside-an-in-app-browser).
- **Both guards matter.** Skipping `init()` stops all capture, but `<DevtoolsOverlay />` still draws its
  button whatever you do, so it needs the same flag or production keeps a button that opens an empty
  panel.

### Optional: starting before Expo Router

Skip this unless you need it. Step 2 is enough for normal use.

The root layout runs after Expo Router's own entry file, so requests and logs from that window are missed,
and the startup breakdown's _App setup_ phase starts later than the app really did. You can move `init()`
ahead of Expo Router by owning the entry file yourself.

Point `main` at your own file:

```json
// package.json
{ "main": "index.js" }
```

Then have that file call `init()` before handing control to Expo Router. The import order is the whole
point, so keep `init()` in a separate module rather than calling it inline: an `import` is hoisted above
statements in the same file, which would put `expo-router/entry` first anyway.

```js
// index.js
import './devtools-init'; // a module whose only job is `devtools.init()`
import 'expo-router/entry';
```

Now remove the `devtools.init()` line from `app/_layout.tsx`, keeping `<DevtoolsOverlay />` there. The
overlay still belongs in the root layout; only the `init()` call moves.

### The launcher button

Nothing has to be configured: `<DevtoolsOverlay />` on its own gives you the bug glyph on a blue circle.
Everything about its appearance is a prop, since that's where you mount it.

| Prop            | Default     | What it does                                                                       |
| --------------- | ----------- | ---------------------------------------------------------------------------------- |
| `iconComponent` | none        | Renders in place of the built-in glyph. Given the resolved `size`; colour is yours |
| `size`          | `44`        | Diameter of the button, in dp                                                      |
| `color`         | accent blue | Button fill                                                                        |
| `iconColor`     | white       | The built-in glyph only; an `iconComponent` colours itself                         |

```tsx
<DevtoolsOverlay
  iconComponent={({ size }) => <MyLogo width={size} height={size} />}
  size={56}
  color="#111827"
/>
```

A `size` under 44 still gets a 44dp touch area through `hitSlop`, so a small button stays as easy to hit
as it looks, and however big you make it, the drag stays inside the screen.

> [!TIP]
> `color` and the default glyph have to work together: a pale button needs `iconColor` set, or the white
> glyph vanishes into it.

## Features

Debugging on a real device usually means plugging into a laptop, or losing the thing you were trying to
reproduce the moment you reach for a menu. This puts the tools where the bug is.

### Network

Every request lands as a row: the method, the status, how long it took, and when. Underneath, the short
name and the full URL, plus badges for the kind of response, where the request came from, and how big it
was. A request still in flight shows an amber **PENDING** so you can tell "waiting" from "finished".

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

**Finding one request among hundreds.** Search the text, then narrow with the chips: type (Fetch/XHR, JS,
Img, Media, Other), method, or source. The method and source chips are built from what you've actually
captured, so they only ever offer real options. There's an **Invert** switch for "everything except this",
and extra toggles to hide data URLs or hide failed requests.

**Testing a bad connection.** Pick Slow 3G, Fast 3G, Fast 4G, Offline, or set your own speed and delay. It
applies immediately, to your app's own requests and to in-app browser pages. You can also pretend to be an
iPhone, an Android phone, a desktop browser, or Googlebot. Every captured request remembers the settings it
ran under, so requests from before and after a change stay easy to tell apart.

**Reading the room.** Turn on the traffic graph to see request volume over time and tap a section to zoom
the list to that moment. Turn on grouping to bundle rows by where they came from, with a count per group.
Or switch to compact rows to fit more on screen.

#### Tapping a request

<table>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/request-headers.png" width="260" alt="Headers tab with a copy button on every value" /></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/request-payload.png" width="260" alt="Request payload as an explorable JSON tree" /></td>
  </tr>
  <tr>
    <td>Headers, with a one-tap copy button on every value.</td>
    <td>The payload as a tree you can open up, not a wall of text.</td>
  </tr>
</table>

A panel slides up with everything captured, across a few tabs:

- **Headers**: what was sent and what came back, each value with its own copy button, plus the connection
  settings this request ran under.
- **Payload**: what you sent, as an explorable tree rather than a wall of text.
- **Preview**: the response pretty-printed and colour-coded; images and HTML render as a real preview.
- **Response**: the raw body, in full, never cut off.
- **Timing**: when it started and how long it took. It also tells you plainly that a DNS/TCP/TLS
  breakdown isn't available on-device, rather than showing numbers it can't measure.

The **⋮** menu copies the URL, or the whole request as a ready-to-paste **cURL** command or `fetch`
snippet.

**Try in sandbox** opens the request as something you can edit: change the method, the URL, the query
parameters, headers, cookies, auth, or the body, then Send and watch the real response come back. Handy
for "does this break if the token is missing?" without touching your code.

<div align="center">
  <img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/sandbox.png" width="260" alt="Sandbox with editable URL, method, auth and query parameters" />
</div>

Prefer to look at it later? **Export** opens the OS share sheet with the currently-filtered list as JSON,
named `network-log-<timestamp>.json`. Mail it to yourself, drop it in Slack, paste it into a bug report.
It uses React Native's own `Share` and nothing else, so there's no filesystem involved and no extra
dependency.

### Console

Everything your app logs, on the device. Warnings sit on a yellow row, errors on a red one, and the
toolbar keeps a running count of each so you can see at a glance whether anything went wrong while you
weren't looking.

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

- Each thing you logged gets its own line, so a message and the object next to it don't run together.
  Objects and arrays start collapsed. Tap to open them up, level by level.
- Errors show their message on the row and the **full stack** when you tap it.
- The same message logged over and over becomes **one row with a count**, so a chatty screen doesn't bury
  everything else.
- Filter by level (each chip carries a live count) or by source, or search the text of every message.
- The newest output stays in view automatically, and stops following if you scroll back to read
  something, with a button to jump back to the newest.
- Copy any line with one tap.

#### Running an expression

The `>` prompt at the bottom runs JavaScript on the device and shows you what came back. Your typed
command appears with a `›`, the answer with a `‹`, and objects come back as the same explorable tree.
Something that returns a promise shows as pending and fills in when it settles, so
`fetch(...).then((r) => r.json())` works as you'd expect.

- Names are **suggested as you type**, including the members of whatever object you're inside.
- **Tap any command you ran earlier** to load it straight back into the prompt.
- Two built-in helpers reach your app's own code in a development build: `$modules('auth')` lists the
  files that are loaded, and `$m('src/stores/auth')` hands you one of them.

To reach your own objects by a short, stable name, pass them in:

```ts
createDevtoolsClient({
  console: { context: { store, queryClient } },
});
```

Your app's files are bundled as private closures, so nothing can reach an imported name on its own the way
a browser console reaches a page's variables. Anything you want to poke at by name, hand over in
`context`. It's also the only thing that works in a release build, where the file list above isn't
available.

> [!IMPORTANT]
> The prompt is **off in release builds** by default, since it runs whatever is typed into it. Turn it on
> deliberately with `console: { repl: true }`.

### Performance

Live metrics on the device, no desktop profiler and no cable. The toolbar carries the record and clear
buttons, then a chip per section. Only the section you're looking at is mounted, so the charts aren't
re-rendering behind a list you're reading.

<table>
  <tr>
    <td width="25%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/perf-user-timing.png" width="200" alt="User timing entries with durations" /></td>
    <td width="25%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/perf-interactions.png" width="200" alt="Slow interactions with handler time and total" /></td>
    <td width="25%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/perf-long-tasks.png" width="200" alt="Long tasks list, newest first" /></td>
    <td width="25%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/perf-limiter.png" width="200" alt="Limiter with thread and duration options" /></td>
  </tr>
  <tr>
    <td>Timings you named yourself.</td>
    <td>Slow taps, handler time beside the total.</td>
    <td>When the thread was stuck, and for how long.</td>
    <td>Block a thread on purpose.</td>
  </tr>
</table>

> [!NOTE]
> Unlike the other two tabs, this one **starts paused**, because measuring isn't free. While it's paused
> nothing is measured at all: the instrumentation detaches rather than running and discarding, so
> leaving it off costs nothing. Pressing record attaches everything fresh and picks up whatever the
> platform still has buffered.

#### Statistics

- **Frame rate**: the JS thread from a frame-delta loop, and the main thread from a native display-link
  counter, on one chart. The gap between them is the reading that matters: a healthy JS line above a
  collapsed main-thread line is an app that feels frozen while every JS metric says it's fine. The
  main-thread figure needs a development build.
- **JS heap**: how much the JavaScript engine has allocated, with a sparkline of the last two minutes so
  you can watch it climb while you use the app.
- **App memory**: the whole process footprint, which is what the OS holds against you and what a user
  means by "memory". Routinely several times the JS heap, so the two are stacked as separate plots rather
  than letting one stand in for the other. Needs a development build.
- **Device memory**: how much RAM the phone has, and how much this app may still allocate, as a meter
  directly under the app's own footprint. On Android the available side is system-wide free memory; on iOS
  it's what the process can still claim before being killed. Needs a development build.
- **Storage**: total, used and free space on the data partition. Android only, for the App Store reason
  below. Needs a development build.
- **Startup**: process start to first render, split into native startup, bundle eval, app setup and first
  render. Measured by this package's own native module, so it works even where the platform's own markers
  are all null. Phase boundaries are this package's load points, not platform milestones, so they shift a
  little with import order. If the platform _does_ report its markers, they're shown underneath as a
  second set.

#### The three lists

- **User timing**: timings you name yourself, following the
  [W3C User Timing](https://www.w3.org/TR/user-timing/) signatures. The one metric here that can point at
  a specific piece of code, so it's the answer to a long task you can't explain:

  ```ts
  devtools.mark('checkout');
  await buildCart();
  devtools.measure('checkout');
  ```

  `measure(name, startOrOptions?, endMark?)` takes a start mark name, or an options object with `start`,
  `end`, `duration` and `detail`, the same shapes the spec defines. Calls are also forwarded to the real
  `performance.mark`/`measure`, so the entries exist on the platform timeline too. Nothing is _observed_
  from that timeline, which is why React's own internal measures never appear here.

- **Interactions**: anything that took longer than 100 ms from the event to the next paint. Each row also
  shows how long your handler itself held the JS thread: a small handler under a large total means the
  interaction was stuck behind something else rather than being slow itself. Durations come rounded to the
  nearest 8 ms, and nothing under 16 ms is ever reported.

- **Long tasks**: anything that blocked the JS thread past the threshold (150 ms by default), newest
  first. A "long task" is one stretch of JavaScript that ran without yielding, so nothing else on that
  thread could happen meanwhile: no touches, no timers, no animation driven from JS. At 60 fps a frame is
  16.7 ms, so 150 ms is about nine frames lost; past ~200 ms it reads as a freeze. Drop
  `performance.longTaskThresholdMs` to 50 if you want to see the smaller ones too.

#### Limiter

The last chip: breaking things on purpose, so the numbers in the other sections can be trusted. Pick a
thread, pick a duration (100 ms to 3 s, or type your own), and block it:

- **JavaScript**: shows up as a long task and drops the FPS reading. Works everywhere.
- **Main (UI)**: freezes what you see and touch while the JS numbers stay perfectly healthy. That gap is
  the blind spot the frame-rate card warns about, and this is how you see it for yourself. Needs a
  development build.

There's also a **Crash** button for either thread, which takes two taps.

> [!WARNING]
> The Limiter isn't restricted to development builds, and it doesn't go through the recording gate either:
> the buttons call straight into the native module, so they work whenever the panel is on screen, whether
> or not `.init()` ran. Guarding the `<DevtoolsOverlay />` mount is what keeps them out of a release.

#### What it deliberately doesn't show

This tab is honest about the difference between what it can actually measure and what you probably want
to know:

- **Storage is Android-only.** Nothing here asks for a permission on either platform, and nothing makes
  your App Store submission harder, which is why iOS storage is missing. `StatFs` on Android needs no
  permission and no manifest entry, but iOS's `systemFreeSize` is one of Apple's required-reason APIs: no
  prompt, but it obliges a privacy-manifest declaration at submission, and a library reading it risks
  pushing that onto every app that embeds it.
- **No "% of heap limit" gauge.** Hermes doesn't report a heap-size limit, so the denominator would have
  to be invented.
- **No heap snapshots or flame charts.** Those come from the CDP `HeapProfiler`/`Profiler` domains over
  the inspector socket, driven from outside the app, and a multi-megabyte snapshot isn't something you'd
  browse on a phone anyway.
- **Long tasks name no culprit.** React Native's `PerformanceLongTaskTiming` returns a permanently empty
  `attribution` array, the web API's mechanism for reporting which code was responsible, so a row can
  tell you a task blocked the thread for 180 ms, but never that it was your list render. Use it to find
  _when_ to look, then correlate against what the app was doing.
- **Some metrics depend on the platform.** Long tasks and the platform's own startup markers only appear
  if the native side implements them, which varies by platform and React Native version. When they're
  missing the tab says so rather than showing zeros.
- **Some entries never reach the list.** The platform keeps its own buffer and discards entries once it
  overflows, telling us only how many went missing. When that happens the list says so rather than
  presenting what survived as the whole picture.

### Themes

The header is one row: the tabs, a palette button, then close. The button lists every theme and switches
the panel immediately. Seven ship with it:

| Id                |                                                      |
| ----------------- | ---------------------------------------------------- |
| `light`           | Chrome DevTools' light Network tab, the default      |
| `dark`            | Chrome DevTools' own dark theme                      |
| `dracula`         | [Dracula](https://draculatheme.com)                  |
| `nord`            | [Nord](https://www.nordtheme.com)                    |
| `monokai`         | Monokai, as in TextMate and Sublime                  |
| `one-dark`        | One Dark, from Atom                                  |
| `solarized-light` | Solarized Light, the second of the two light options |

Each is the project's published colours mapped onto this panel's tokens, not an approximation.

<div align="center">
  <img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/theme-picker.png" width="260" alt="Theme picker listing the built-in themes and a custom one" />
</div>

Pick which one it opens with, and add your own:

```ts
export const devtools = createDevtoolsClient({
  defaultTheme: 'midnight',
  themes: {
    midnight: { base: 'dark', colors: { accent: '#a78bfa' } },
  },
});
```

A theme names a `base` to inherit from (any of the seven) and overrides only the tokens it cares about,
so a one-colour change is a one-line entry rather than a copy of all 21 that rots whenever a token is
added. Reuse a built-in's id as your own name and you replace it. A `defaultTheme` naming something that
was never registered is ignored rather than leaving the panel unstyled.

The choice lives in memory for the session, like the tab you last had open. Persisting it would mean
taking a storage dependency for a devtools colour scheme. The full token list is the `Palette` type,
exported from the package root.

## Capturing inside an in-app browser

A `<WebView>` runs its own separate JavaScript, invisible to everything above, so it needs two props wired
up:

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

That covers both the page's **requests and its console output**. Rows show up tagged
`WebView::[my-webview]` in either tab, and the Source chips can filter them apart from your app's own.
TypeScript will reject a name you didn't declare.

> [!IMPORTANT]
> Use `injectedJavaScriptBeforeContentLoaded`, not `injectedJavaScript`: the latter runs after the page's
> own scripts have already fired, so their requests escape.

Three optional extras, only needed if you want throttling to reach the page too:
`ref={devtools.getWebViewRef('my-webview')}` lets a speed change reach an already-open page,
`userAgent={devtools.getWebViewUserAgent()}` applies the browser override for real, and
`onShouldStartLoadWithRequest={devtools.shouldAllowWebViewRequest}` blocks navigation while Offline is on.
A page can never be _fully_ throttled: images, stylesheets and scripts the browser loads by itself still
go out at full speed.

## Configuration

`createDevtoolsClient(config?)`. Every option is optional, and the defaults are what most apps want.

| Option                               | Type                          | Default     | Description                                                                             |
| ------------------------------------ | ----------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `defaultTheme`                       | `string`                      | `'light'`   | Which theme the panel opens with: a built-in or one of yours.                           |
| `themes`                             | `Record<string, ThemeConfig>` | `undefined` | Your own themes: a `base` to inherit and the tokens to override.                        |
| `webviewSources`                     | `string[]`                    | `undefined` | Names of in-app browser views allowed to report in, for the Network and Console tabs.   |
| `network.includeFetch`               | `boolean`                     | `true`      | Capture requests made with `fetch`.                                                     |
| `network.includeXmlHttpRequest`      | `boolean`                     | `true`      | Capture `XMLHttpRequest`. This is what catches axios and most other HTTP libraries.     |
| `network.disabledByDefault`          | `boolean`                     | `false`     | Open the Network tab not recording. The record button in its toolbar starts capture.    |
| `console.capture`                    | `boolean`                     | `true`      | Mirror `console.*` into the Console tab, including from declared browser views.         |
| `console.repl`                       | `boolean`                     | `__DEV__`   | Show the `>` prompt. Off in release builds unless you ask for it.                       |
| `console.context`                    | `Record<string, unknown>`     | `undefined` | Extra names an expression can use, e.g. `{ store, queryClient }`.                       |
| `console.disabledByDefault`          | `boolean`                     | `false`     | Open the Console tab not recording. The `>` prompt still works while it's off.          |
| `performance.sampleIntervalMs`       | `number`                      | `1000`      | How often the JS heap is read. Each read crosses into the engine, so keep it coarse.    |
| `performance.longTaskThresholdMs`    | `number`                      | `150`       | Only report tasks that blocked the JS thread at least this long.                        |
| `performance.interactionThresholdMs` | `number`                      | `100`       | Only report interactions that took at least this long, event to next paint.             |
| `performance.historySize`            | `number`                      | `120`       | How many memory samples, long tasks, user timings and interactions are kept.            |
| `performance.disabledByDefault`      | `boolean`                     | `true`      | Open the Performance tab not recording. On by default, since measuring costs something. |

Every field of every panel, and the rest of the API (the client's methods, the overlay's props, the theme
tokens, the exported types) is in [`REFERENCE.md`](./REFERENCE.md).

## Leaving it in production

Shipping the code is safe. Until `.init()` runs, nothing is patched and nothing is recorded, so the cost of
leaving the package in a production bundle is the bundle size and nothing else. There are two switches, and
they do different jobs:

- **Capture:** `if (DEVTOOLS_ENABLED) devtools.init();` patches `fetch`, `XMLHttpRequest` and `console`.
  Skip it and nothing is ever recorded.
- **Access:** `{DEVTOOLS_ENABLED && <DevtoolsOverlay />}` draws the floating button. Skip it and there's no
  way into the panel.

`DEVTOOLS_ENABLED` is whatever condition you want, evaluated at runtime.
`process.env.EXPO_PUBLIC_APP_ENV !== 'prod'` from the [Quick start](#quick-start) and `__DEV__` are the two
usual choices; anything else works too, including a value you fetch for a specific user.

> [!WARNING]
> Guarding these two calls is the whole mechanism. There's no config option that does it for you, and the
> overlay does not check whether `init()` ran: mount it without the guard and a production build gets a
> floating button opening an empty panel.

Note that the Limiter's crash buttons are not restricted to development builds either. They live behind the
panel, so the guard above is what keeps them unreachable.

## Example app

`example/` is a runnable Expo app for trying all of this against real traffic. It has one screen per tab,
each a wall of buttons:

- **Requests** fires GET, POST and DELETE, downloads an image and uploads one, across `fetch`,
  `XMLHttpRequest` and axios so you can watch all three interception paths land in the same list. Its
  WebView sub-tab loads a real external site, whose own requests arrive tagged with their source.
- **Console** covers every kind of output worth testing, grouped into levels, argument shapes (mixed
  arguments, nested objects, arrays of objects, class instances, `Map` and `Set`, exotic primitives, empty
  values) and edge cases (circular references, a throwing getter, an unhandled rejection, a message
  repeated five times, a very long message, and a 600-entry flood).
- **Performance** blocks the JS thread for 60ms, 150ms, 400ms or three bursts in a row, runs a deliberately
  slow tap handler, records `mark` and `measure` pairs with and without `detail`, and allocates memory you
  can retain or release to make the heap chart move.

`example/devtools.ts` doubles as a worked configuration: a dark default theme, a custom `midnight` one, two
declared `webviewSources`, and a `console.context` you can reach from the prompt.

```sh
cd example
bun run start   # Expo Go / dev client
bun run ios     # or: bun run android (full native build)
```

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for what's built, what the platform genuinely can't do (and why this
doesn't fake it), and what's still on the table.
