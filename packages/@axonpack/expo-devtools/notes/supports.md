# Supports

Optional integrations with other packages. Each one has its own entry point,
`@axonpack/expo-devtools/support/<name>/v<major>`, and once the app passes it in `supports` it adds a
tab, a DevTools panel, a `devtools` command line topic, optional names in the `>` prompt, and a
`useSupport()` hook over a store of its own. The first is preview, `support/preview/v0`, for
`@axonpack/preview` 0.x.

## Features

- [x] `config.supports`, a generic contract with no package names in the main entry
- [x] One entry point per support and supported major, `src/support/<name>/v<major>/`, published as
      `./support/<name>/v<major>`, with no unversioned entry
- [x] Another major of the package installed is reported like a missing one, naming the entry to use
- [x] Two supports of one id in `supports`: the first is used, the other logged
- [x] A default import, a namespace import and named imports all work, and the package's config types
      are named exports
- [x] A support's package stays a separate, optional install: an app that doesn't use the support
      doesn't need it
- [x] A missing package is logged with `console.error` and shown in the support's tab, with no throw
- [x] A support's provider goes around the app with the devtools off too
- [x] A support's tab in the panel and its panel in React Native DevTools, before Crashes
- [x] Preview: its provider, its list as the Preview tab in the panel's theme, the same list in React
      Native DevTools
- [x] Every support keeps its data in an AxonStore of its own, filled inside its provider, and its
      entry exports `useSupport()` over it
- [x] A support's command line topic, listed only while it is in `supports`; an `off` topic with the
      error when it can't run. Its actions go through `act()`, so the CLI tab logs them
- [x] A support's names in the `>` prompt, under the app's own `console.context`
- [x] Preview: its store (`status`, `previews`, `servers`) fed from `usePreviewStatus()`,
      `usePreview()` and the dev server list, and `useSupport()`
- [x] Preview: the `preview` topic (what runs now, the dev servers, the previews), refreshed on each
      new query, with `switch <id> --yes` and `default --yes`
- [x] Preview: `preview` in the `>` prompt, with the data and the same actions
- [ ] Preview: the config plugin added for the app

## How it works

The main package knows no support by name. `config.supports` takes entries of one small shape,
`DevtoolsSupport` (`core/stores/supports.store.ts`): an id, a title, an icon, and optionally a
`Provider` around the app, a `Tab` for the panel, a `Panel` for React Native DevTools, a `topic` for
the command line tool, a `context` for the `>` prompt and an `error`.
The start stores them once, before the `enabled` gate, and the provider wraps the app in each
`Provider` with the devtools on or off. The tab bar and the DevTools tab add one tab per support,
before Crashes. A DevTools tab is a React root of its own, so the devtools wrap a support's `Panel`
in its `Provider` again there. With the devtools on, the start logs each `error` with
`console.error` after the console patch, so it reaches the Metro terminal, LogBox and the Console
tab, and the tab and panel show the error in bold in place of their content.

The agent (`agent/services/install-agent.service.ts`) answers over the feature topics plus one per
support, read from the supports store on each call, so `devtools topics` lists a support's topic only
while it is configured, and its actions go through `act()` like any other, which logs them in the CLI
tab. A support with an `error` has no topic of its own; the agent lists one of its `id` that is off,
with the error as the reason, so a query says what to install. The start merges each support's
`context` into the prompt's names, and the app's own `console.context` wins a clash.

Each support keeps its data in an AxonStore (`createAxonStore`) in its own folder, filled inside its
`Provider` from the package's own state, so the topic and the prompt read it without a hook. Its
entry exports the store's hook as `useSupport()`, the same name in every support.

A support lives in `src/support/<name>/v<major>/` and is published as the
`./support/<name>/v<major>` export, with the same conditions as the main entry. `<major>` is the
major of the package it supports, and there is no unversioned entry. A new major of that package
gets a new folder, and the old one stays until a major release of expo-devtools removes it. The
support reads the installed version from the package's `package.json`, required in the same `try`
before the package itself, so a package whose own load throws is still checked. Another major is
reported like a missing package, with the entry to use. All versions of a support share one `id`,
and the start keeps the first support of an id and logs the others, since two providers of one
package would fight over it. It loads its package with a `require` directly inside a `try`
at module scope, which Metro treats as an optional dependency and which also catches a package whose
own load throws (see `detect-router.service.ts`). Its `configure()` turns the result into a
support, or into one with the install error, and never throws. Its default export holds the same
functions as its named exports, so a default import and a namespace import read alike. Types are
named exports only, re-exported from the package; in an app without it they stay unresolved and
become `any` under `skipLibCheck` (Expo's base tsconfig sets it).

This package's own typecheck resolves a supported package to its source through the `expo-source`
condition. For preview it also reads expo-file-system's published types through a `paths` entry,
since that package's source fails `noUnusedParameters` here.

The main bundle carries this package's `package.json`, which the agent reads for its version, so the
optional peers' names and the `./support/<name>/v<major>` export keys are in it as data. No support
code is. An app that imports a support also carries the supported package's `package.json`, for its
version.

## Preview

`src/support/preview/v0/`, for preview 0.x. Its provider goes around the app with the devtools off as well. A preview is
a release bundle, so `enabled: __DEV__` is off inside it, and preview marks a preview broken when its
provider never mounts on that start. The docs tell apps to keep the devtools on in the bundles QA
switches between, since otherwise there is no panel to switch back from.

The store (`stores/preview-support.store.ts`) holds `status`, `previews` and `servers`.
`components/preview-store-feed.component.tsx` sits inside preview's provider, calls
`usePreviewStatus()`, `usePreview()` and `useDevPreviewServersState()`, and writes their values to
the store after each render. So with the support configured, `usePreviewStatus()` runs on every start,
and in a debug build from Metro with `devPreviewServers` on it does its one look for dev servers.

The topic (`constants/preview-agent.const.ts`) is built in `configure()`, since switching to a preview
that isn't downloaded needs the config. Rows are `now`, then each dev server (`host:port`), then each
preview. Each new query calls the status's `refresh()` and answers `# wait:` until it is done, like
the storage topic's key listing. `switch <id>` and `default` need `--yes`, then restart through
preview's own `previewsStore.switchTo`, `devPreviewServersStore.switchTo` and `backToDefault`, after a
300 ms timer so the reply reaches the CLI before the app reloads. The prompt's `preview` runs the same
actions through `runAction` with `yes` set, and reads the store through getters.

The tab renders preview's `PreviewList`, with the theme store's palette, which preview maps itself.
The list reads preview's own stores, the same state the support's store is filled from.
In React Native DevTools the provider mounts again with the panel (preview then reads the list on
open and confirms the start again, which changes nothing). A FlatList there draws its first rows and
stops, so the panel passes `virtualized={false}`, and preview's Add a host field is uncontrolled,
since a controlled `TextInput` throws when typed into in a tab.
