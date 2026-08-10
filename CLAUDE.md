# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@INPUT_STYLES.md

@CONVENTIONS.md

## Repository overview

Turborepo + bun workspaces monorepo intended to hold `@axonpack/*` — free OSS foundation libraries for React Native/Expo. See `docs/plan.md` for the roadmap (`@axonpack/lite-storage`, `@axonpack/expo-devtools`, `@axonpack/api-kit`, `@axonpack/i18n`). **Only `@axonpack/expo-devtools` is implemented so far**; `apps/` exists but is currently empty. `packages/linter` (npm name: `linter`, deliberately _not_ `@axonpack/*`-scoped) is separate from that roadmap — it's an internal, non-public shared oxlint base config, not a `@axonpack/*` product library. Only packages actually meant for npm carry the `@axonpack/` scope; right now that's `@axonpack/expo-devtools` alone.

`README.md` is stale `create-turbo` boilerplate — it describes a `web`/`docs` Next.js setup and `@repo/ui`/`@repo/eslint-config`/`@repo/typescript-config` packages that don't exist in this repo. Don't rely on it.

## Package manager & workspaces

- **bun only** — pinned via `devEngines.packageManager` in the root `package.json` (bun 1.3.14, Node >=24).
- Root `workspaces` glob is non-standard because of the `@axonpack` npm scope directory and a nested example app:
  `apps/*`, `packages/*`, `packages/@axonpack/*`, `packages/@axonpack/expo-devtools/example`.
  A plain `packages/*` glob does **not** match `packages/@axonpack/expo-devtools` (two levels deep) — new scoped packages are covered by the `packages/@axonpack/*` entry, but each package's own `example/` app needs its own explicit workspace entry to get linked via bun (otherwise its `@axonpack/expo-devtools` dependency won't resolve to the local package).
- Run `bun install` from the **repo root**, not from inside a package or example — bun's workspace linking depends on the root lockfile.

## Commands

### Root (fans out via turbo)

- `bun install` — also runs `prepare` (husky) automatically as part of its own lifecycle.
- `bun run build` / `bun run lint` / `bun run check-types` — `turbo run <task>`; only runs for workspaces that define that script, others are silently skipped.
- `bun run format` — `prettier --write "**/*.{ts,tsx,md}"` across the whole repo.

### `@axonpack/expo-devtools` package (run from `packages/@axonpack/expo-devtools`)

- `bun run build` — `node internal/module_scripts/build.js`: plain `tsc` compile of `src` → `build`. Does **not** clean first, so stale compiled files from removed/renamed sources linger — run `bun run clean` first when that matters.
- `bun run lint` / `bun run format` — `oxlint src` / `oxlint src --fix`. Rules come from `oxlint.config.mts` extending the shared `linter` base config (`packages/linter`). The migration off eslint is done; the old `lint:oxlint` script is gone, and eslint is no longer a gate.
- `bun run check-types` — `tsc --noEmit`.
- `bun run test` — jest (`jest-expo` preset, roots at `src`). No test files exist yet; runs in watch mode locally unless `CI`/`EXPO_NONINTERACTIVE` is set.

### Example app (run from `packages/@axonpack/expo-devtools/example`)

- `bun run ios` / `bun run android` — `expo run:ios` / `expo run:android` (full native build via prebuild — needs Xcode/Android Studio).
- `bun run start` — `expo start` (Expo Go / dev client, no native rebuild).
- `bun run web` — `expo start --web`.

### Git hooks (husky, installed automatically by root `prepare`)

- `pre-commit` — blocks direct commits to `main`/`dev` (create a feature branch: `git switch -c <type>/<short-description>`), then runs `bun run format && bun run lint`.
- `commit-msg` — runs commitlint (`commitlint.config.js` at repo root): conventional-commit `type` restricted to a fixed enum, and if a scope is given it must be exactly `@axonpack/expo-devtools` (the only package that exists yet — extend `scope-enum` there when adding more packages).
- `post-merge` — runs `bun install`.

## Architecture: `@axonpack/expo-devtools`

Pure JS/TSX Expo module — no native iOS/Android code (removed; `expo-module.config.json` declares no native platforms). `package.json` `exports` uses an `expo-source` condition pointing Metro straight at `src/index.ts`, and a `default` condition pointing other consumers at the compiled `build/`.

### Client pattern (`src/client/create-devtools-client.client.ts`)

The public API is a single factory, deliberately **not** a React Provider/Context:

```ts
const devtools = createDevtoolsClient({
  enabled, // master switch; false makes init() a no-op
  name: "My App", // panel header identity — see below
  icon: require("./assets/icon.png"),
  webviewSources: ["my-webview"], // top-level: both tabs capture from a WebView
  network: { includeFetch, includeXmlHttpRequest, disabledByDefault },
  console: { capture, repl, context, disabledByDefault },
});
devtools.init(); // call once at app startup — installs the fetch/XHR/console patches
```

Everything is optional and the defaults suit most apps. The UI is mounted separately, via the exported `<DevtoolsOverlay />` — the factory installs instrumentation, it doesn't render.

- `webviewSources` uses a TS 5 `const` type parameter, so the literal array flows into `getWebViewInjectedJavaScriptBeforeContentLoaded`/`handleWebViewMessage`'s parameter types — passing an undeclared name is a compile error, not just a lint warning. It doubles as a runtime allowlist: `handleWebViewNetworkMessage` silently drops messages whose `source` isn't in the list. It sits at the top level rather than under `network` because the console tab captures from a declared WebView too, and the allowlist has to be one list for both.
- `name`/`icon` are top-level and must be passed explicitly — there is no way to detect them. A device's installed launcher icon isn't reachable from JS without native code, and `expoConfig.icon` is a build-time path string, not something `Image` can load in a standalone build. They reach the header through `stores/app-identity.store.ts` rather than a prop, because `DevtoolsOverlay` is mounted somewhere else in the tree and never sees the config object.
- **Two independent gates, easily confused.** `enabled` is the master switch `init()` flips; there is no UI for it, and with it off nothing records anywhere (this is what makes shipping the code to production free). `paused` is what the record button in each tab's toolbar controls. `disabledByDefault` sets `paused`, not `enabled` — mapping it to `enabled` would leave a tab permanently dead, since nothing in the UI can turn that back on. REPL rows pass `{ force: true }` to `consoleLogStore.add` so the `>` prompt still answers while the console is paused.

### Network logging (`src/services/network/`, `src/stores/network/`)

Three independent interception paths feed one shared store (`stores/network/network-log.store.ts` — in-memory ring buffer capped at 200 entries, pub/sub via `expo`'s `EventEmitter`, read via `useSyncExternalStore` in `network-view.component.tsx`):

- `services/network/patch-fetch.service.ts` — wraps `globalThis.fetch`. Required because **Expo installs its own native fetch by default** (`expo/winter/fetch`), which does not route through `XMLHttpRequest` the way the old whatwg-fetch polyfill did — patching XHR alone cannot see it.
- `services/network/patch-xhr.service.ts` — patches `XMLHttpRequest.prototype.open`/`.send`. This is what actually catches third-party HTTP client libraries whose RN adapter is built on XHR rather than fetch (a common pattern) and any raw `XMLHttpRequest` usage.
- `services/network/webview-network-logger.service.ts` — a `<WebView>` runs in a completely separate JS engine (WKWebView/Android WebView), invisible to both patches above. `getWebViewInjectedJavaScriptBeforeContentLoaded(name)` returns a JS string that patches fetch/XHR _inside the page_ and relays every request back via `postMessage`; `handleWebViewNetworkMessage(event, allowedSources)` (called through the client, not directly) parses that and writes into the same store. Relative URLs are resolved against `location.href` since real pages request plenty of relative paths.

Request/response bodies are logged in full — no truncation, by design.

### Example app (`example/`)

Regenerated via `create-expo-app` (not the `create-expo-module` template) — hence its own `assets/`/`app.json` rather than the module scaffold's. `App.tsx` is just a top-level tab switcher; real screens live in `components/`: `NativeRequests.tsx` (fetch/XHR/third-party HTTP client demo buttons), `WebViewDemo.tsx` (loads a real external site so its traffic gets captured), `RequestsScreen.tsx` (Native/WebView sub-tabs), `TabBar.tsx` (shared, `primary`/`secondary` visual variants). `devtools.ts` creates the one shared client instance, imported by both `index.ts` (`.init()`) and `WebViewDemo.tsx` (`.getWebViewInjectedJavaScriptBeforeContentLoaded`/`.handleWebViewMessage`).

## Known quirks worth remembering

- Root `turbo.json`'s `outputs: [".next/**", ...]` is left over from the Next.js starter and doesn't match `@axonpack/expo-devtools`'s actual build output (`build/**`) — `turbo run build` warns `no output files found for task @axonpack/expo-devtools#build` and can never cache it. Not a bug to "fix" reflexively; just don't be surprised the build always re-runs.
- bun's install layout doesn't hoist a config package's own tooling deps into whatever package uses that config. `eslint-config-universe`'s `import/resolver`/`import/parsers` settings reference `eslint-import-resolver-node` and `@typescript-eslint/parser` by string name, which only resolve correctly (including in editor ESLint integrations, not just the CLI) if those packages are listed directly as devDependencies of `@axonpack/expo-devtools` — both already are, for this reason. If a similar "works via CLI, fails in editor" resolver error shows up for another `eslint-config-universe` dependency, the fix is the same: add it directly to that package's own `devDependencies`.
- `react-native-webview` in the example app links via classic RN community autolinking (`react-native.config.js`), not Expo Modules autolinking — `expo-modules-autolinking search` won't list it; that's expected, not a bug.
- oxlint's `jsPlugins` resolves the same way the `eslint-config-universe` quirk above describes: a JS plugin declared in the shared `linter` base config is resolved from the _consuming_ package's own `node_modules`, not from `linter`'s. The original `@oxlint/migrate` output for `@axonpack/expo-devtools` pulled in `eslint-plugin-prettier` this way; it was dropped from `linter` entirely rather than have every consumer redeclare it, since Prettier already runs as its own `format` step and oxlint's own docs call that plugin slow.
