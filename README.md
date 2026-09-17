<div align="center">

<img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/logo.png" width="88" alt="Axonpack" />

# Axonpack

Axonpack ends the guesswork when things break. Answers you and your agent can both read: every
request, error, log and stored value, captured on the device and copied out as structured JSON.

**[Documentation](https://axonpack.github.io/docs)** · [Expo Devtools](https://axonpack.github.io/docs/expo-devtools) · [React Native Devtools Tab](https://axonpack.github.io/docs/react-native-devtools-tab) · [React Pretty Print](https://axonpack.github.io/docs/react-pretty-print)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-fe5196.svg)](https://www.conventionalcommits.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

<table>
  <tr>
    <td width="25%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/network-log.png" width="200" alt="Network tab listing captured requests" /></td>
    <td width="25%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/console-log.png" width="200" alt="Console tab listing captured logs" /></td>
    <td width="25%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/perf-statistics.png" width="200" alt="Performance tab showing frame rate and memory charts" /></td>
    <td width="25%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/screenshots/theme-picker.png" width="200" alt="Theme picker listing the built-in themes" /></td>
  </tr>
  <tr>
    <td>Every request as it happens.</td>
    <td>Every log, explorable.</td>
    <td>Frame rate, memory, startup.</td>
    <td>Seven themes, or your own.</td>
  </tr>
</table>

<em><a href="./packages/@axonpack/expo-devtools">@axonpack/expo-devtools</a>: browser-style devtools that live inside your app.</em>

</div>

## Packages

Each package is published to npm and versioned independently. Nothing here depends on anything else
here, so you install only what you need.

| Package                                                                                                                                                       | Description                                                                                                 | Version                                                                                                                                           | Downloads                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@axonpack/expo-devtools`](./packages/@axonpack/expo-devtools)<br/>[Docs](https://axonpack.github.io/docs/expo-devtools)                                     | On-device network, console, performance, storage and crash devtools for React Native and Expo               | [![npm](https://img.shields.io/npm/v/@axonpack/expo-devtools.svg)](https://www.npmjs.com/package/@axonpack/expo-devtools)                         | [![downloads](https://img.shields.io/npm/dm/@axonpack/expo-devtools.svg)](https://www.npmjs.com/package/@axonpack/expo-devtools)                         |
| [`@axonpack/react-native-devtools-tab`](./packages/@axonpack/react-native-devtools-tab)<br/>[Docs](https://axonpack.github.io/docs/react-native-devtools-tab) | Your own tab in React Native DevTools, drawn from a component that runs in the app                          | [![npm](https://img.shields.io/npm/v/@axonpack/react-native-devtools-tab.svg)](https://www.npmjs.com/package/@axonpack/react-native-devtools-tab) | [![downloads](https://img.shields.io/npm/dm/@axonpack/react-native-devtools-tab.svg)](https://www.npmjs.com/package/@axonpack/react-native-devtools-tab) |
| [`@axonpack/react-pretty-print`](./packages/@axonpack/react-pretty-print)<br/>[Docs](https://axonpack.github.io/docs/react-pretty-print)                      | Collapsible JSON and XML trees and a syntax highlighter, for React and React Native from one implementation | [![npm](https://img.shields.io/npm/v/@axonpack/react-pretty-print.svg)](https://www.npmjs.com/package/@axonpack/react-pretty-print)               | [![downloads](https://img.shields.io/npm/dm/@axonpack/react-pretty-print.svg)](https://www.npmjs.com/package/@axonpack/react-pretty-print)               |

### @axonpack/expo-devtools

Browser-style devtools inside your app: tap a floating button for Network, Console, Performance and
Storage on the device itself. No desktop debugger, no cable, and nothing is captured unless
`enabled` says so, which is what makes shipping the code to production free.

```sh
npx expo install @axonpack/expo-devtools react-native-safe-area-context react-native-webview expo-clipboard
```

```tsx
import { DevtoolsProvider } from "@axonpack/expo-devtools";

export default function App() {
  return (
    <DevtoolsProvider config={{ enabled: __DEV__ }}>
      <YourApp />
    </DevtoolsProvider>
  );
}
```

[Installation](https://axonpack.github.io/docs/expo-devtools/installation) · [Quick start](https://axonpack.github.io/docs/expo-devtools/quick-start) · [Production](https://axonpack.github.io/docs/expo-devtools/production) · [Changelog](https://axonpack.github.io/docs/expo-devtools/changelog)

### @axonpack/react-native-devtools-tab

A tab of your own in React Native DevTools, beside Console and Sources. The tab is a React component
that runs **in the app**, so it reads the app's own state and a button in it calls the app's own
functions: no bridge, and no copy to keep in sync. No fork of the DevTools frontend, no browser
extension and no second window.

```sh
npm install @axonpack/react-native-devtools-tab
```

```tsx
import { ReactNativeDevtoolsPanel } from "@axonpack/react-native-devtools-tab";

function Session() {
  const { user } = session.use();
  return <button onClick={() => auth.signOut()}>signed in as {user}</button>;
}

ReactNativeDevtoolsPanel.registerTab({ name: "Session", component: Session });
```

[Installation](https://axonpack.github.io/docs/react-native-devtools-tab/installation) · [Quick start](https://axonpack.github.io/docs/react-native-devtools-tab/quick-start) · [Production](https://axonpack.github.io/docs/react-native-devtools-tab/production) · [Changelog](https://axonpack.github.io/docs/react-native-devtools-tab/changelog)

### @axonpack/react-pretty-print

One implementation of collapsible JSON and XML trees and a syntax highlighter, for both React and
React Native. You pass the container, text and pressable components in; the package owns expansion
state, array chunking, collapsed-node previews, an XML parser, a 38-language tokenizer and 130
palettes. It has no dependencies and imports neither `react-native` nor the DOM, so a web project
configures no bundler alias and a native project writes no adapter.

```sh
npm install @axonpack/react-pretty-print
```

```tsx
import { JsonTree, domPrimitives } from "@axonpack/react-pretty-print";
import { LIGHT_THEME } from "@axonpack/react-pretty-print/themes";

<JsonTree primitives={domPrimitives} value={response} theme={LIGHT_THEME} />;
```

[JSON tree](https://axonpack.github.io/docs/react-pretty-print/json-tree) · [Primitives](https://axonpack.github.io/docs/react-pretty-print/primitives) · [Reference](https://axonpack.github.io/docs/react-pretty-print/reference)

## Repository layout

A [Turborepo](https://turborepo.dev) + [Bun workspaces](https://bun.sh/docs/install/workspaces)
monorepo.

```
packages/@axonpack/*   published libraries, one folder each
packages/linter        shared oxlint base config, internal and deliberately unscoped
docs                   the documentation site, a git submodule with its own install
```

`docs` is a submodule of [`axonpack/axonpack.github.io`](https://github.com/axonpack/axonpack.github.io),
and it builds and deploys itself. It is not a workspace member, so the root `install`, `build`,
`lint` and `check-types` all skip it by design. Run `bun install` inside `docs/` to work on it.

## Development

Bun only, pinned via `devEngines.packageManager` (Bun 1.3.14, Node >= 24).

```sh
git clone --recurse-submodules https://github.com/axonpack/axonpack.git
cd axonpack
bun install
```

Already cloned without `--recurse-submodules`? `git submodule update --init` fills in `docs/`.

| Command               | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `bun run build`       | `turbo run build` across every workspace that defines it |
| `bun run lint`        | `turbo run lint` (oxlint)                                |
| `bun run check-types` | `turbo run check-types` (`tsc --noEmit`)                 |
| `bun run format`      | Prettier over the repo                                   |
| `bun run dev:docs`    | Start the documentation site                             |
| `bun run changeset`   | Record a release note for a change                       |

Run `bun install` from the repository root, not from inside a package: Bun's workspace linking
depends on the root lockfile.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full workflow, coding conventions, commit format,
and how to run a package's example app.

## Contributing

Contributions are very welcome: bug reports, docs fixes, and PRs alike. Please read
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md) first.

## License

MIT © [Md Asadujjaman](https://github.com/abappi19). See [`LICENSE`](./LICENSE).
