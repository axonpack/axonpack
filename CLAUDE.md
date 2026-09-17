# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@INPUT_STYLES.md

@CONVENTIONS.md

## Writing style

These apply to everything written here: code comments, docs, commit messages, UI strings,
changesets, and replies in chat.

- **No em dashes.** Not in prose, not in comments, not in UI text. If a sentence seems to want
  one, rewrite it. Usually that means splitting it into two sentences, or using a comma, a colon,
  or brackets. Do not swap the em dash for an en dash or a hyphen and call it done. The sentence
  itself has to change.
- **Write plainly.** Short sentences. Common words. Say the thing directly instead of dressing it
  up. If a simpler word does the job, use it.
- **Do not write like an AI.** Skip the polished, over-balanced phrasing and the tidy rule of
  three. Skip filler openers like "it's worth noting" or "in essence". A comment should sound like
  one engineer telling another what is going on.
- Keep the existing rule from CONVENTIONS.md: comments explain why, not what.

## Repository overview

Turborepo + bun workspaces monorepo intended to hold `@axonpack/*`, the free OSS foundation libraries for React Native/Expo (`@axonpack/lite-storage`, `@axonpack/expo-devtools`, `@axonpack/api-kit`, `@axonpack/i18n`). **All three are published: `@axonpack/expo-devtools` and `@axonpack/react-pretty-print`** (collapsible JSON/XML trees and a syntax highlighter, for React and React Native from one implementation, with its own `example-web` and `example-native` apps). The third, `@axonpack/react-native-devtools-tab`, puts a tab of your own in React Native DevTools, drawn from a component that runs in the app, so the tab reads the app's own state with no bridge and no copy. Its own README is the reference, and `packages/@axonpack/react-native-devtools-tab/notes/README.md` indexes its notes. `docs/` is the documentation site (Next.js + Fumadocs, MDX under `content/docs/<package-slug>/`), but it is **not part of this repo**: it is a git submodule of `axonpack/docs`, mounted the same way `marketing/` is. It is self-contained (own lockfile, own `node_modules`, own oxlint config, no workspace dependency) and it builds and deploys itself; nothing here builds or lints it. `packages/linter` (npm name: `linter`, deliberately _not_ `@axonpack/*`-scoped) is separate from that roadmap. It's an internal, non-public shared oxlint base config, not a `@axonpack/*` product library. Only packages actually meant for npm carry the `@axonpack/` scope; right now that's those three.

## Package manager & workspaces

- **bun only**, pinned via `devEngines.packageManager` in the root `package.json` (bun 1.3.14, Node >=24).
- Root `workspaces` glob is non-standard because of the `@axonpack` npm scope directory and a nested example app:
  `packages/*`, `packages/@axonpack/*`, `packages/@axonpack/react-native-devtools-tab/example`, `packages/@axonpack/expo-devtools/panel`, `packages/@axonpack/expo-devtools/example`, `packages/@axonpack/react-pretty-print/example-web`, `packages/@axonpack/react-pretty-print/example-native`. There is deliberately **no `apps/*`** and no `docs` entry, because `docs/` is a submodule with its own install, and listing it would make bun hoist its dependencies to this root, which breaks its Turbopack root and stops it building on its own.
  A plain `packages/*` glob does **not** match `packages/@axonpack/expo-devtools` (two levels deep), so new scoped packages are covered by the `packages/@axonpack/*` entry, but each package's own `example/` app needs its own explicit workspace entry to get linked via bun (otherwise its `@axonpack/expo-devtools` dependency won't resolve to the local package).
- Run `bun install` from the **repo root**, not from inside a package or example, because bun's workspace linking depends on the root lockfile.

## Commands

### Root (fans out via turbo)

- `bun install`: also runs `prepare` (husky) automatically as part of its own lifecycle.
- `bun run build` / `bun run lint` / `bun run check-types`: `turbo run <task>`; only runs for workspaces that define that script, others are silently skipped.
- `bun run format`: `prettier --write "**/*.{ts,tsx,md}"` across the whole repo.
- `bun run dev:docs`: `cd docs && bun run dev`. The one root script that reaches into the submodule, and it only runs its dev server; nothing here builds or lints it.
- `bun run changeset` / `bun run version-packages` / `bun run release`: Changesets. `version-packages` also runs `sync:docs-changelog`, which regenerates the docs site's changelog pages from each package's `CHANGELOG.md` and skips quietly when the submodule isn't checked out.

### `@axonpack/expo-devtools` package (run from `packages/@axonpack/expo-devtools`)

- `bun run build`: `node internal/module_scripts/build.js`: plain `tsc` compile of `src` → `build`. Does **not** clean first, so stale compiled files from removed/renamed sources linger. Run `bun run clean` first when that matters.
- `bun run lint` / `bun run format`: `oxlint src` / `oxlint src --fix`. Rules come from `oxlint.config.mts` extending the shared `linter` base config (`packages/linter`), which is now a thin extend of `oxlint-config-universe/native`, the maintained oxlint port of `eslint-config-universe` and what Expo's own packages extend. It replaced a 2,600-line `@oxlint/migrate` snapshot. The base turns off `curly` (universe wants braces everywhere; this codebase has always used single-line guard clauses, and it was 539 warnings about a settled style question) and the unused-binding rules for TypeScript, which tsc already reports. The migration off eslint is done; the old `lint:oxlint` script is gone, and eslint is no longer a gate.
- **`bun run lint` currently reports 3 warnings**, all from React rules the old base did not carry: two `react(set-state-in-effect)` and one `react(immutability)`, in the network detail panel and the crash stack section. They are real observations about async components, not noise. They are left visible rather than disabled or blind-fixed. Warnings do not fail the gate, but an **error** does, so check the exit code rather than grepping for `warning`.
- `bun run check-types`: `tsc --noEmit`.
- `bun run test`: jest (`jest-expo` preset, roots at `src`), 614 tests across 69 suites. Runs in watch mode locally unless `CI`/`EXPO_NONINTERACTIVE` is set, so prefix `CI=1` for a one-shot run. `@axonpack/react-pretty-print` uses `bun test` instead, not jest.

### Docs site (the `docs/` submodule)

Its own repository, `axonpack/docs`, so almost everything about it is documented in `docs/README.md` rather than here. What matters from this side:

- **Both live sites show only what is published.** A planned package gets no entry in `docs`'s `src/lib/packages.ts`, no `content/docs/<slug>/` folder, no card on the landing page, and there is no roadmap on either site. It earns those on the day it goes to npm. Naming a library on a public page is a promise and documentation is a promise that something works as described; neither has anything behind it until the thing is installable. Unshipped work lives in `notes/plan.md` in this repo and nowhere else.

- **Run `bun install` inside `docs/`**, not at this root. It is not a workspace member, so the root install, `format`, `lint`, `build` and `check-types` all skip it. `turbo run` will not list it, and that is correct, not a misconfiguration.
- **A docs change is two commits**: one in the submodule, one here to move the gitlink. `git submodule update --remote docs` pulls the latest.
- `docs` is in `.prettierignore` for the same reason `marketing` is: the root `format` task would rewrite it and leave the gitlink permanently dirty.
- It **deploys itself**, via `.github/workflows/deploy.yml` in that repo, on its own `GITHUB_TOKEN`, no secret and no credential to rotate. That is the whole point of the docs living in the repo they are served from; a cross-repo push needed a deploy key or a token, and both were tried and thrown away.
- Served at `https://axonpack.github.io/docs`, a Pages **project site**, so the URL prefix is the repo name. Because that repo is named `docs`, the app's own routes sit at _its_ root (the introduction at `/`, a package at `/<slug>`); a second `/docs` segment would only double the prefix.

### Landing page (the `landing-page/` submodule)

Its own repository, `axonpack/axonpack.github.io`, serving `https://axonpack.github.io`. **That name is the only reason the repo exists**: GitHub serves the organisation root from a repository named after the org and nothing else. It coexists with the docs because GitHub routes `/<repo>` to the matching project site, so `axonpack/docs` keeps `/docs`. **Never add a `docs/` directory to the landing repo**; it would shadow that path.

- One `index.html`, four images in `assets/`, no build step, no dependencies, no workflow. Pages serves the branch directly. A page that changes a few times a year does not earn a toolchain, and without one there is nothing to break in CI.
- Edit and push; Pages redeploys itself. Its Pages source is **Deploy from a branch**, `main` / `(root)`, not GitHub Actions.
- Its palette mirrors the docs site on purpose, so the two do not read as different products.
- In `.prettierignore` for the same reason `docs` and `marketing` are.

### Example app (run from `packages/@axonpack/expo-devtools/example`)

- `bun run ios` / `bun run android`: `expo run:ios` / `expo run:android` (full native build via prebuild, which needs Xcode/Android Studio).
- `bun run start`: `expo start` (Expo Go / dev client, no native rebuild).
- `bun run web`: `expo start --web`.

### Git hooks (husky, installed automatically by root `prepare`)

- `pre-commit`: blocks direct commits to `main`/`dev` (create a feature branch: `git switch -c <type>/<short-description>`), then runs `bun run format && bun run lint`.
- `commit-msg`: runs commitlint (`commitlint.config.js` at repo root): conventional-commit `type` restricted to a fixed enum, and if a scope is given it must be one of `@axonpack/expo-devtools`, `@axonpack/react-pretty-print`, `linter` or `docs`. Extend `scope-enum` there when adding a package.
- `post-merge`: runs `bun install`.

## Architecture: `@axonpack/expo-devtools`

Almost entirely JS/TSX. There is exactly one native module, `ios/AxonpackDevtoolsModule.swift` and `android/.../AxonpackDevtoolsModule.kt`, declared in `expo-module.config.json`, and it does two things JS cannot: block/crash the **main** thread for the Limiter section, and report the real process start time (`sysctl` `kinfo_proc` on iOS, `Process.getStartUptimeMillis()` on Android) so the Startup section works where `performance.rnStartupTiming` returns all nulls. It is loaded with `requireOptionalNativeModule`, so an app in Expo Go still works and only those two buttons go dark. The crash paths are deliberately **not** gated on `__DEV__`, because reaching them needs the panel, which needs a started client, so `config.enabled` is the single gate for everything in this package. `package.json` `files` therefore publishes `ios`, `android` and `expo-module.config.json` alongside `build`. `package.json` `exports` uses an `expo-source` condition pointing Metro straight at `src/index.ts`, and a `default` condition pointing other consumers at the compiled `build/`.

### Provider pattern (`src/client/start-devtools.client.ts`, `src/core/components/devtools-provider.component.tsx`)

There is **one mount and no client object**. Everything else is a hook or a module singleton:

```tsx
<DevtoolsProvider
  config={{
    enabled: __DEV__, // the whole production gate; off means nothing is patched at all
    defaultTheme: "dark", // a built-in id, or one of `themes` below
    themes: { midnight: { base: "dark", colors: { accent: "#a78bfa" } } },
    network: { http, websocket, sse, disabledByDefault }, // by kind of traffic, not by transport
    console: { capture, repl, context, disabledByDefault },
    storage: { adapters },
  }}
  showFloatingButton // false hides the launcher, panel still there — open it with the hook
>
  <App />
</DevtoolsProvider>
```

The provider calls `startDevtools(config)` **during render**, not in an effect: a parent's effects run after its children's, so an effect would install the patches after the app's first mount and miss whatever that mount requested. `startDevtools` is idempotent and reads the config once, so a rebuilt object on a later render changes nothing, and it is not exported from the package — the provider is the only caller, which is why there is no `init` in the public API.

- **Three exports do what the client object used to.** `useDevtoolsPanel()` opens and closes the panel from the app's own UI (`{ visible, enabled, show, hide, toggle }`, reading `core/stores/panel-visibility.store.ts`), which is what makes `showFloatingButton={false}` usable rather than a dead end. `useDevtoolsWebView(name)` returns the whole prop bundle for a `<WebView>` to spread. `devtools` is a module-level object for the imperative leftovers: `mark`/`measure`/`clearMarks`/`clearMeasures`, `setCrashContext`, and the stores. All three work because every store in this package is already a singleton; nothing ever needed an instance passed around.
- **A WebView's name is a free string, not a declared list.** There used to be a `webviewSources` allowlist doubling as a `const` type parameter; it was the only reason the factory was generic, and it bought nothing a marker check does not — `handleWebViewNetworkMessage` already ignores any message without this package's own marker, and a page that fakes the marker can fake a listed name just as easily. So the name is whatever `useDevtoolsWebView('checkout')` was handed, and it is only a label on the row. `console.capture` moved with it: it used to live in the factory closure and now sits in `webview-console-logger.service.ts` behind `setWebViewConsoleCapture`, next to the socket and stream flags, because the hook has no client to ask.
- **Theming** (`core/constants/theme.const.ts`, `core/stores/theme.store.ts`, `core/utils/themed-styles.util.ts`). `StyleSheet.create` copies the colour values it is handed, so a sheet built at module load can never follow a theme. Every sheet in the package is therefore built through `makeThemedStyles((COLORS) => ({...}))`, which returns a hook and caches one sheet per palette identity. Components read loose colours with `useThemeColors()`. Naming the factory's parameter `COLORS` is what made the migration mechanical: 210 in-style usages needed no edit. Colour-returning helpers (`getStatusColor`, `getMethodColor`, `getLongTaskColor`, `getResponseTypeVisual`, `consoleLevelVisuals`) take a `Palette` argument rather than closing over one; `isErrorStatus` exists because one call site compared a colour to `COLORS.error`, which stops meaning anything once there are two palettes. Seven palettes ship (`light`, `dark`, `dracula`, `nord`, `monokai`, `one-dark`, `solarized-light`), each mapped from the project's own published colours. Custom themes patch a base (`{ base, colors }`) instead of supplying all 21 tokens, and the active choice is in memory for the session, because persisting it would mean a storage dependency. There is no longer an app icon or name in the header: it holds the tab bar, the theme picker and close.
- **Two independent gates, easily confused.** Each store's internal `enabled` flag is what the start flips, and `config.enabled` is what decides whether the start happens at all; until it does nothing records anywhere, which is what makes shipping the code to production free. There is no UI for either. `paused` is what the record button in each tab's toolbar controls. `disabledByDefault` sets `paused`, not `enabled`. Mapping it to `enabled` would leave a tab permanently dead, since nothing in the UI can turn that back on. REPL rows pass `{ force: true }` to `consoleLogStore.add` so the `>` prompt still answers while the console is paused.

### Network logging (`src/features/network/services/`, `src/features/network/stores/`)

Three independent interception paths feed one shared store (`features/network/stores/network-log.store.ts`, an in-memory ring buffer capped at 200 entries, pub/sub via `expo`'s `EventEmitter`, read via `useSyncExternalStore` in `network-view.component.tsx`):

- `features/network/services/patch-fetch.service.ts`: wraps `globalThis.fetch`. Required because **Expo installs its own native fetch by default** (`expo/winter/fetch`), which does not route through `XMLHttpRequest` the way the old whatwg-fetch polyfill did, so patching XHR alone cannot see it.
- `features/network/services/patch-xhr.service.ts`: patches `XMLHttpRequest.prototype.open`/`.send`. This is what actually catches third-party HTTP client libraries whose RN adapter is built on XHR rather than fetch (a common pattern) and any raw `XMLHttpRequest` usage.
- `features/network/services/webview-network-logger.service.ts`: a `<WebView>` runs in a completely separate JS engine (WKWebView/Android WebView), invisible to both patches above. `getWebViewInjectedJavaScriptBeforeContentLoaded(name)` returns a JS string that patches fetch/XHR _inside the page_ and relays every request back via `postMessage`; `handleWebViewNetworkMessage(event)` (reached through `useDevtoolsWebView`, not directly) parses that and writes into the same store. Relative URLs are resolved against `location.href` since real pages request plenty of relative paths.

Request/response bodies are logged in full, with no truncation, by design.

### Performance (`src/features/performance/services/`, `src/features/performance/stores/`)

Pure JS, no native module, so it is bounded by what the RN web-performance APIs expose, and the tab
states its own limits rather than faking past them. Collectors feed one store
(`features/performance/stores/performance.store.ts`, same ring-buffer + `EventEmitter` shape as the network log):

- `read-startup-timing.service.ts`: `performance.rnStartupTiming`, read once at `init()`. Probes
  `reactNativeStartupTiming` too, since the getter was renamed across RN versions. All four fields
  (`startTime`, `endTime`, `initializeRuntimeStart`, `executeJavaScriptBundleEntryPointStart`) are
  nullable, and the platform only fills them if its native code calls `ReactMarker.setAppStartTime`.
- `sample-memory.service.ts`: `performance.memory`, polled on an interval (1s default). **Every read
  crosses JSI** into Hermes (`hermes_allocatedBytes`/`hermes_heapSize`), so a fast interval would make
  the profiler the slowdown it is measuring. `memory` is a _throwing getter_ on runtimes without an
  implementation (JSC/V8), so even the capability probe is inside a `try`.
- `observe-long-tasks.service.ts`: `PerformanceObserver` on `'longtask'`, gated on
  `PerformanceObserver.supportedEntryTypes`, which is populated from what native actually implements
  and so varies by platform and RN version. Observed with `buffered: true`, because the startup long
  tasks are the interesting ones and they're long gone by the time the panel opens.
- `fps-monitor.service.ts`: a `requestAnimationFrame` delta loop. **Not started by the collector
  service at all**: it keeps the JS thread awake for as long as it lives, so `PerformanceView` starts
  it on mount and tears it down on unmount. This is also why the Performance panel is the only one
  _not_ kept mounted behind a hidden tab (`devtools-panel.component.tsx`). The other two stay mounted
  to preserve filters and scroll position, which would here mean a permanent rAF loop.

`performance-collectors.service.ts` owns the lifecycle of the collectors above: it subscribes to the store
and attaches or detaches every collector in step with the record button, rather than leaving them
attached and filtering in `add*`. **This is load-bearing, not tidiness.** An observer registered while
recording was paused delivered nothing after recording resumed, so `performance.disabledByDefault:
true` followed by pressing record produced a permanently empty list while starting unpaused worked
fine. Re-attaching on resume also re-reads the buffered native entries. The store's own `paused`
checks stay as a second line of defence. `readStartupTiming` is exempt, being a one-shot read of markers
that never change, so it runs whether or not recording is on.

Hermes reports no `jsHeapSizeLimit`, so there is deliberately no "% of limit" gauge. JS heap is not
app memory (RSS), UI-thread jank is invisible to a JS rAF loop, and heap snapshots/flame charts come
from the CDP `HeapProfiler`/`Profiler` domains over the inspector socket, all of which would need
native code, and none of which this tab pretends to provide.

### Storage (`src/features/storage/services/`, `src/features/storage/stores/`)

Two things here are unlike every other tab, and both look like oversights if you don't know why:

- **This package depends on no storage library, and cannot discover a store.** `@react-native-async-storage/async-storage`, `react-native-mmkv` and `expo-secure-store` are separate installs with their own native code; adding one would force it on every consumer and undo the "one native module on purpose" rule. So the consumer registers its stores in the provider's `config.storage.adapters`: nothing is discovered, so that list is the whole of what the tab can see. `features/storage/services/define-adapter.service.ts` holds the four public factories (`asyncStorageAdapter`, `mmkvAdapter`, `secureStoreAdapter`, `defineStorageAdapter`) and normalises every driver shape into one internal `StorageAdapter`. Reads are always `await`ed, sync drivers included. `kind: 'sync'` is a UI badge, never a branch. Driver methods are called **through the driver object**, never destructured, because a native instance's method loses `this` when you pull it off it. Both async-storage batch APIs are handled (3's `getMany`, 1/2's `multiGet`) and both MMKV majors (4 renamed `delete` to `remove` and returns `ArrayBuffer` where 3 returned `Uint8Array`, so the driver type asks only for a `byteLength`).
- **`storage.store.ts` has no `paused` flag.** The `enabled`-until-`init()` gate is there as usual, but the second gate is not: `paused` exists for the three tabs recording a stream that costs something continuously, and storage is a pull whose cost is per read. So the toolbar carries Refresh where the others carry a record button, which is why `DevtoolsToolbar`'s `paused`/`onTogglePaused`/`onClear` props are optional. The Storage tab passes **no `onClear`** deliberately: that `block` icon means "clear the log" in three tabs and must never come to mean "wipe the user's storage".

Nothing patches the registered store instance, so there is no mutation history and app behaviour is unchanged. The tab only calls what it was handed. `write-storage.service.ts` returns an error string rather than throwing, and re-reads the one key it touched instead of trusting what it wrote, since a store may normalise the value. An entry's display type (`StoredValueKind`) is classified **once at read time** and stored on the entry, because `classifyStoredValue` parses JSON and re-running it for a thousand keys on every filter keystroke would be the slowest thing in the tab. MMKV has no type query, so the type is probed `getString` → `getNumber` → `getBoolean` → `getBuffer`, each checked `!== undefined` and never for truthiness, because a stored `0` or `false` is a value, and treating it as a miss would hide the key entirely. `StorageView` reads on mount rather than at `init()`: a store the panel is never opened on shouldn't be read at all. It holds the **selected key**, not the selected entry, because an edit replaces the entry object in the store and a sheet holding the old one would keep showing the value you just changed.

### Example app (`example/`)

Regenerated via `create-expo-app` (not the `create-expo-module` template), hence its own `assets/`/`app.json` rather than the module scaffold's. `App.tsx` is just a top-level tab switcher wrapped in the one `<DevtoolsProvider>`; real screens live in `components/`, one per devtools tab plus one per transport: `NativeRequests.tsx` (fetch/XHR/third-party HTTP client buttons), `ExpoFetchDemo.tsx`, `NitroFetchDemo.tsx`, `WebSocketDemo.tsx` and `EventStreamDemo.tsx` (one transport each), `WebViewDemo.tsx` (loads a real external site so its traffic gets captured) and `WebViewPageApisDemo.tsx` (a page making its own sockets, streams and requests), `RequestsScreen.tsx` (the Native/WebView sub-tabs over those), `ConsoleDemo.tsx`, `PerformanceDemo.tsx`, `CrashDemo.tsx`, `StorageDemo.tsx` (seeds AsyncStorage / MMKV / SecureStore / an in-memory `Map` with a spread of value shapes, and can write past the 1,000-key read cap), and the shared `TabBar.tsx` (`primary`/`secondary` visual variants) and `ActionButton.tsx`. `devtools.ts` holds the shared `devtoolsConfig` (as `satisfies DevtoolsConfig<...>`, which is what still typechecks `defaultTheme` against the declared `themes`), and owns the MMKV instance and the in-memory `Map` the storage adapters are registered with. `App.tsx` passes that config to the one `<DevtoolsProvider>`; `StorageDemo.tsx` imports the stores from it. The WebView demos take `useDevtoolsWebView`, and the console/crash/performance demos take `devtools`, both straight from the package. The example is the only place the three real storage libraries are installed; it typechecks against them, which is what keeps the duck types in `define-adapter.service.ts` honest. AsyncStorage and SecureStore are inside Expo Go, so they work under `bun run start`; MMKV is not, and `createMMKV()` **throws** when its native module is missing, so `devtools.ts` wraps it in a try/catch, exports `mmkv` as possibly-null, and spreads the MMKV adapter in conditionally. Without that the example crashes at import in Expo Go rather than degrading. Adding native deps means a prebuild and a native rebuild (`bun run ios`), not just `bun install`.

## Known quirks worth remembering

- Root `turbo.json`'s default `outputs: [".next/**", ...]` came from the Next.js starter. Nothing in this repo builds a Next app any more (the docs submodule has its own), and it doesn't match `@axonpack/expo-devtools`'s actual build output (`build/**`). `turbo run build` warns `no output files found for task @axonpack/expo-devtools#build` and can never cache that one. `@axonpack/react-pretty-print` and its web example have per-task overrides declaring their real outputs, so they do cache; expo-devtools has none. Not a bug to "fix" reflexively; just don't be surprised that one build always re-runs.
- bun's install layout doesn't hoist a config package's own tooling deps into whatever package uses that config. `eslint-config-universe`'s `import/resolver`/`import/parsers` settings reference `eslint-import-resolver-node` and `@typescript-eslint/parser` by string name, which only resolve correctly (including in editor ESLint integrations, not just the CLI) if those packages are listed directly as devDependencies of `@axonpack/expo-devtools`, and both already are, for this reason. If a similar "works via CLI, fails in editor" resolver error shows up for another `eslint-config-universe` dependency, the fix is the same: add it directly to that package's own `devDependencies`.
- `react-native-webview` in the example app links via classic RN community autolinking (`react-native.config.js`), not Expo Modules autolinking, so `expo-modules-autolinking search` won't list it; that's expected, not a bug.
- oxlint's `jsPlugins` resolves the same way the `eslint-config-universe` quirk above describes: a JS plugin declared in the shared `linter` base config is resolved from the _consuming_ package's own `node_modules`, not from `linter`'s. The original `@oxlint/migrate` output for `@axonpack/expo-devtools` pulled in `eslint-plugin-prettier` this way; it was dropped from `linter` entirely rather than have every consumer redeclare it, since Prettier already runs as its own `format` step and oxlint's own docs call that plugin slow.
