# Contributing to Axonpack

Thanks for taking the time to contribute! This repo hosts `@axonpack/*` — free, open-source
foundation libraries for React Native / Expo apps. Only `@axonpack/expo-devtools` is implemented so far;
see [`docs/plan.md`](./docs/plan.md) for the roadmap of what's coming next.

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.

## Prerequisites

- [Bun](https://bun.sh) 1.3.14 (pinned via `devEngines.packageManager` in the root `package.json`)
- Node.js >= 24
- Xcode / Android Studio only if you need to run the example app's native builds
  (`expo run:ios` / `expo run:android`)

## Getting set up

```sh
git clone https://github.com/axonpack/axonpack.git
cd axonpack
bun install
```

Always run `bun install` from the **repo root**, not from inside a package or example — bun's
workspace linking depends on the root lockfile. This also runs `prepare` (husky git hooks)
automatically.

> New scoped package? The root `workspaces` glob is non-standard: `apps/*`, `packages/*`,
> `packages/@axonpack/*`, and `packages/@axonpack/expo-devtools/example`. A plain `packages/*` glob doesn't
> match `packages/@axonpack/expo-devtools` (two levels deep). Each package's own `example/` app also needs
> its own explicit workspace entry, or its `@axonpack/<package>` dependency won't resolve locally.

## Project structure

```
packages/@axonpack/<name>/       # a published package
packages/@axonpack/<name>/example/  # its Expo example/demo app
apps/                          # currently empty — reserved for future standalone apps
docs/plan.md                   # roadmap for the wider @axonpack/* family
```

## Development workflow

From the repo root, `turbo` fans commands out to every workspace that defines them:

```sh
bun run build         # turbo run build
bun run lint          # turbo run lint
bun run check-types   # turbo run check-types
bun run format        # prettier --write "**/*.{ts,tsx,md}" across the whole repo
```

Working on a specific package (e.g. `@axonpack/expo-devtools`), run its scripts directly from that
package's directory — see that package's own `README.md` for details:

```sh
cd packages/@axonpack/expo-devtools
bun run build
bun run lint
bun run check-types
bun run test
```

To try your changes in the example app:

```sh
cd packages/@axonpack/expo-devtools/example
bun run start   # Expo Go / dev client, no native rebuild
bun run ios     # or: bun run android — full native build via prebuild
```

## Coding conventions

Read these before opening a PR — they're enforced in review, not just style suggestions:

- [`CONVENTIONS.md`](./CONVENTIONS.md) — file naming, folder layout, comment style
- [`INPUT_STYLES.md`](./INPUT_STYLES.md) — canonical text-input styling for the devtools UI

## Commits

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) and pass
commitlint (see `commitlint.config.js`):

- **Type** — one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
  `chore`, `revert`, `wip`, `release`.
- **Scope** — optional, but if given it must exactly match an existing package name (currently only
  `@axonpack/expo-devtools`).

```
feat(@axonpack/expo-devtools): add cookie jar visibility for webview requests
fix(@axonpack/expo-devtools): resolve scroll issue in detail panel
docs: update contributing guide
```

Direct commits to `main`/`dev` are blocked by a pre-commit hook — always work on a feature branch:

```sh
git switch -c <type>/<short-description>
```

`pre-commit` also runs `bun run format && bun run lint` before every commit.

## Adding a changeset

User-facing changes to a package should ship with a changeset, so they land in that package's
changelog on release:

```sh
cd packages/@axonpack/expo-devtools
bun run release:add
```

Write the entry for the person using the library, not for another developer — plain language,
one bullet per change, no internal file/function names.

## Submitting a pull request

1. Fork the repo and create your branch from `main`.
2. Make your change, following the conventions above.
3. Add a changeset if the change is user-facing (see above).
4. Make sure `bun run lint`, `bun run check-types`, and the affected package's `bun run test` pass.
5. Open a PR with a clear description of the change and why it's needed.

By contributing, you agree that your contributions will be licensed under this repo's
[MIT License](./LICENSE).
