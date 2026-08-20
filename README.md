<div align="center">

<img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/logo.png" width="88" alt="Axonpack" />

# Axonpack

Free, open-source foundation libraries for React Native and Expo apps: small, focused,
dependency-light packages you drop in rather than a framework you adopt.

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

> [!NOTE]
> Early days. Only [`@axonpack/expo-devtools`](./packages/@axonpack/expo-devtools) is implemented so far.
> `@axonpack/lite-storage`, `@axonpack/api-kit`, and `@axonpack/i18n` are planned. See its
> [notes](./packages/@axonpack/expo-devtools/notes/README.md) for what the one that exists does.

## Packages

This is a [Turborepo](https://turborepo.dev) + [Bun workspaces](https://bun.sh/docs/install/workspaces)
monorepo. Each package under `packages/@axonpack/*` is published independently.

| Package                                                         | Description                                                                 | Version                                                                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`@axonpack/expo-devtools`](./packages/@axonpack/expo-devtools) | On-device network, console and performance devtools for React Native / Expo | [![npm](https://img.shields.io/npm/v/@axonpack/expo-devtools.svg)](https://www.npmjs.com/package/@axonpack/expo-devtools) |

See each package's own README for installation and usage. Start with
[`@axonpack/expo-devtools`](./packages/@axonpack/expo-devtools/README.md).

## Development

This repo uses **Bun only** (pinned via `devEngines.packageManager`, Bun 1.3.14, Node >= 24).

```sh
git clone https://github.com/axonpack/axonpack.git
cd axonpack
bun install
```

```sh
bun run build         # turbo run build
bun run lint          # turbo run lint
bun run check-types   # turbo run check-types
bun run format        # prettier --write "**/*.{ts,tsx,md}"
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full workflow, coding conventions, commit
format, and how to run a package's example app.

## Contributing

Contributions are very welcome: bug reports, docs fixes, and PRs alike. Please read
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md) first.

## License

MIT © [Md Asadujjaman](https://github.com/abappi19). See [`LICENSE`](./LICENSE).
