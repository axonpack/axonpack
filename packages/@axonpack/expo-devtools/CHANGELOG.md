# @axonpack/expo-devtools

## 2.4.0

### Minor Changes

- 038b71d: - New **Crashes** tab: every crash the app has hit, with the unread count on the tab itself
  - **Crash report sheet** opens the moment a crash is caught, with the message, stack, component stack, breadcrumbs, device details and the raw record
  - **Stack frames name your files** — in development the stack is symbolicated against the dev server, so a frame reads `CrashDemo.tsx:79:25` instead of `index.bundle:104857:23`, with the failing source line and a caret under the exact column — for a render error, both the throwing line and the element that rendered it — and library frames folded behind **See N more frames**
  - **Copy and share** any report as Markdown or JSON, straight to the share sheet
  - **Crashes that end the app** are saved to the device and reported the next time it opens
  - **Catches four kinds of crash**: fatal and non-fatal JavaScript errors, unhandled promise rejections, React render errors, and uncaught native exceptions on iOS and Android
  - **Unhandled promise rejections are now caught in release builds**, which React Native only reports during development
  - New **`DevtoolsErrorBoundary`** shows a Try again screen where a render error used to leave a blank one, and records which component threw
  - **Keep crash reporting on in production** with `crash.enableWhileDevtoolsDisabled` — it works whether or not you start the devtools, and the panel, the console prompt and request logging all stay off
  - **Only crashes that actually close the app are reported when the devtools are not started** — JavaScript errors the app recovered from stay a development concern
  - **Turn off React Native's red box** with `crash.disableDefaultLogBox`, so a JavaScript error is reported in one place
  - **The floating devtools button now hides itself** unless the tools were started, so leaving it mounted in a release build shows nothing
  - **A plain crash notice outside development** — what broke, when, and a Share report button — rather than the developer sheet with its tabs and stack traces
  - **Tap an error in the Console tab** to read its full crash report without leaving the tab
  - **Breadcrumbs** replay the console and network activity leading up to a crash
  - **`redact`** rewrites or drops a report before it is stored, saved or handed to `onCrash`
  - **`setCrashContext`** attaches your own details — user, screen, feature flags — to every report
- 038b71d: - New **Debug** tab for the tools that break the app on purpose — blocking a thread, and crashing one
  - **The Limiter has moved** off the Performance tab into Debug; every other Performance section reports something that happened, while this one causes it

## 2.3.0

### Minor Changes

- 1f5e7d8: - New **Storage** tab: every key in every store you register, with its value, type and byte size, plus the store's total size and largest key
  - Register the stores you already use — `asyncStorageAdapter`, `mmkvAdapter`, `secureStoreAdapter`, or `defineStorageAdapter` for anything else — through `createDevtoolsClient({ storage: { adapters } })`. This package still depends on no storage library
  - Search keys, values or both, with match case / whole word / regex, filter by value type, sort by key, size or type, and group by the `auth:token` / `cache/user/1` prefixes your keys already use
  - Inspect a value in the same expandable JSON tree the Network and Console tabs use, or read the raw characters exactly as stored
  - Edit one value or delete one key, with a confirmation on delete. A value is written back through the type it was read as, so a number stays a number. There is no store-wide clear anywhere in the tab
  - Honest about what a store can't do: SecureStore's keys can't be listed so you name them, reads stop at `storage.maxKeys` (1,000) and say how many they skipped, and binary values are shown but not editable
  - Export the filtered keys of a store as JSON through the share sheet

## 2.2.0

### Minor Changes

- f8f2fa0: - Search the Payload, Preview and Response tabs of a request, with every match highlighted in place — in the JSON tree, in syntax-coloured code, and in the raw body
  - Searching a JSON tree opens the branches holding a match and collapses the rest, so a hit is never buried in a closed node
  - Match case, whole word and regex switches on every search box, in the Network filter, the Console filter and the request detail panel
  - Highlighted matches in the request list and in console output
  - Filter requests by status — 2xx / 3xx / 4xx / 5xx / Failed / Pending, offering only the ones actually captured
  - Invert now flips the whole Network filter rather than only the search text, and a new Clear resets every filter at once
  - New `matchHighlight` palette token, set on all seven built-in themes, for the search highlight background
  - Fixed the Preview tab rendering unsyntax-highlighted bodies in near-black, unreadable on every dark theme

## 2.1.1

### Patch Changes

- 92a7884: ## 📝 Documentation

  - The README now gathers Network, Console and Performance under one Features section.
  - Every Performance section has its own screenshot.
  - The theme picker and a request's payload view are now pictured.
  - The reference page now warns that starting the tools and mounting the panel are separate guards, and a release build needs both.

## 2.1.0

### Minor Changes

- 20e0134: ## ✨ Features

  - The Performance tab is now split into sections you pick from the toolbar — Statistics, User timing, Interactions, Long tasks and Limiter — instead of everything sharing one long screen.
  - Only the section you are looking at is drawn, so the tab is lighter on older phones and the graphs no longer redraw while you read a list.
  - The Limiter, for freezing the app on purpose, is now one of those sections rather than a panel that opened over everything else.
  - Every list tells you when recording is off, and offers to start it, instead of looking empty.
  - Long tasks now lists the freezes worth acting on: anything over 150 milliseconds, rather than 50. You can still ask for the shorter ones.

  ## 📝 Documentation
  - A new reference page explains every tab, section, button and field in the panel, alongside the full list of settings.
  - Setting the tools up in an app that uses Expo Router is now written up, with where to start them and where to put the button.
  - Three settings were documented under the wrong name or the wrong default. The page now matches what the code actually does.

## 2.0.0

### Major Changes

- d21c34c: ## ✨ Features

  - **Performance** — a new tab showing what your app is doing to the device, with no desktop profiler and no cable.
  - Watch the JavaScript memory climb while you use the app, on a live graph.
  - See the frame rate, so you can tell a slow screen from a slow network.
  - See how long your app took to start, broken into its stages.
  - **Long tasks** — a list of every moment the app froze for long enough to notice, with when it happened and for how long.
  - **Interactions** — taps that took too long to respond, with the time your own code was responsible for shown separately.
  - The panel header now shows your app's own name and icon instead of the devtools' own, so it looks like part of your app.
  - Any tab can start switched off, for when you only want one of them recording.

  ## 🐛 Bug Fixes
  - Requests no longer raise an error and go missing from the log when the response comes back as a file, an image, or anything else that isn't plain text. In some apps this affected every request the app made.

  ## ⚠️ Breaking Changes
  - The list of in-app browser views to capture is now given at the top level, as `webviewSources`, instead of inside `network`. It covers both the network and console tabs, so it no longer belongs to either one. Move it up a level:

    ```ts
    // before
    createDevtoolsClient({ network: { webviewSources: ['my-webview'] } });

    // after
    createDevtoolsClient({ webviewSources: ['my-webview'] });
    ```

    Left inside `network` it is silently ignored, and nothing from that browser view is captured.

  - The `enabled` option is gone. Guard the `.init()` call instead — until it runs, nothing is recorded:

    ```ts
    if (__DEV__) devtools.init();
    ```

### Minor Changes

- f837bdc: ## ✨ Features

  - The devtools panel now opens on whichever tab you had open last, instead of going back to Network every time.

### Patch Changes

- ed00598: ## 🐛 Bug Fixes

  - Requests no longer raise an error and go missing from the network log when their response comes back as a file, an image, or anything else that isn't plain text. In some apps this affected every request the app made.
  - Those responses now show a short summary with their type and size, instead of appearing empty.
  - A page open in an in-app browser is no longer disturbed when it loads that kind of response.

## 1.1.1

### Patch Changes

- ## 📝 Documentation
  - The package page now shows what the tools actually look like, with screenshots of the request list, the console, and the expression prompt.
  - Rewritten as a walkthrough of what you can do — find one request among hundreds, try a slow connection, resend a request with different details, read your logs and run an expression — rather than a list of settings.

## 1.1.0

### Minor Changes

- ea2f7c7: ## ✨ Features

  - **Console** — a new tab in the devtools panel showing everything your app logs, without a desktop debugger attached.
  - Warnings and errors are coloured and counted, so problems stand out while you scroll.
  - Objects and arrays can be opened up and explored, instead of appearing as `[object Object]`.
  - Errors show their full stack when you tap them.
  - The same message logged over and over collapses into one line with a count, so a chatty screen doesn't bury everything else.
  - **Run an expression** — type JavaScript at the prompt and see the result straight away, with name suggestions as you type.
  - Tap a command you ran earlier to load it back into the prompt and send it again.
  - Anything logged inside an in-app browser page is captured too, labelled so you can tell it apart from your app's own output.
  - Filter by level or by where a message came from, or search the text of every message.
  - The list follows new output as it arrives, and holds still when you scroll back to read something, with a button to jump to the newest again.
  - Copy any line with one tap.
  - Nothing is captured until you turn devtools on, the same as the network inspector, and the expression prompt stays out of production builds unless you ask for it.

### Patch Changes

- f331f08: ## ✨ Features

  - **Network throttling** — try your app on a slow connection without leaving your desk. Pick Slow 3G, Fast 3G, Fast 4G or Offline, or set your own speed and delay.
  - Throttling applies to your app's own requests and to requests made inside an in-app browser view.
  - **User agent** — pretend to be an iPhone, an Android phone, a desktop browser or Googlebot, or type your own.
  - Both settings take effect straight away, with no need to restart the app.
  - Every captured request now shows the connection settings it actually ran under, so requests recorded before and after a change stay easy to tell apart.
  - The sandbox has its own connection settings section, so you can slow a request down while trying it out.
  - The devtools panel and its pop-up sheets now carry the axonpack logo.

  ## 🐛 Bug Fixes
  - Requests an in-app browser page makes while it is still loading are now captured. Previously they were missed entirely.
  - Requests still in flight now stand out as an amber "PENDING" instead of blending into the rest of the row.
  - Request rows show a proper icon for each kind of response, instead of the words "HTTP", "CSS" and "JS".
  - JSON responses now have their own orange marker.

  ## ⚠️ Breaking Changes
  - If you capture requests from an in-app browser view, rename `getWebViewInjectedScript` to `getWebViewInjectedJavaScriptBeforeContentLoaded` and pass it to the `injectedJavaScriptBeforeContentLoaded` prop instead of `injectedJavaScript`. The new prop runs earlier, which is what lets requests made during page load be captured.

## 1.0.1

### Patch Changes

- ## 🐛 Bug Fixes
  - Fixed links on the npm package page that pointed to the project's old GitHub location.

## 1.0.0

### Major Changes

- b1abc8e: ## ✨ Features

  First release of `@axonpack/expo-devtools` — an on-device network inspector for React Native and Expo apps.

  - A draggable button opens a full network inspector right inside your app, no desktop tool needed.
  - Nothing is captured until you turn it on, so it's safe to leave in a production build.
  - Requests made with `fetch`, `XMLHttpRequest`, and popular HTTP client libraries (like axios) are captured automatically.
  - Requests made inside an in-app browser view can be captured too, once you opt a screen into it.
  - Search and filter requests by method, type, or source, and reverse the sort order.
  - A tap-to-filter activity graph shows your request traffic over time, with time labels.
  - Tap any request to see its headers, a pretty-printed preview, the raw response, and timing details.
  - Image, HTML, and SVG responses show up as an actual preview, not just raw text.
  - Failed requests (4xx/5xx) are clearly marked in red so they stand out from successful ones.
  - Copy any header value, the full request URL, or a ready-to-paste cURL command with one tap.
  - A built-in sandbox lets you edit and resend any captured request — method, URL, headers, query params, or body — and see the response live.
  - Export your current, filtered request log to share it with someone else.
  - Request and response bodies are always shown in full, never cut off.
