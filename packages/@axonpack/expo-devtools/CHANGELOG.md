# @axonpack/expo-devtools

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
