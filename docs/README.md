# Axonpack

**Axonpack ends the guesswork when things break.**

Answers you and your agent can both read. Every request, error, log and stored value, captured on
the device and copied out as structured JSON.

Live at [axonpack.github.io](https://axonpack.github.io). Docs at
[axonpack.github.io/docs](https://axonpack.github.io/docs).

## Published

| Library                                                                                            | Version                                                                         | What it does                                                                       |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`@axonpack/expo-devtools`](https://axonpack.github.io/docs/expo-devtools)                         | ![npm](https://img.shields.io/npm/v/@axonpack/expo-devtools?label=)             | Browser-style devtools that run inside your app, on the device                     |
| [`@axonpack/react-native-devtools-tab`](https://axonpack.github.io/docs/react-native-devtools-tab) | ![npm](https://img.shields.io/npm/v/@axonpack/react-native-devtools-tab?label=) | Your own tab in React Native DevTools, drawn from a component that runs in the app |
| [`@axonpack/react-pretty-print`](https://axonpack.github.io/docs/react-pretty-print)               | ![npm](https://img.shields.io/npm/v/@axonpack/react-pretty-print?label=)        | Collapsible JSON and XML trees, plus a syntax highlighter                          |

```sh
npx expo install @axonpack/expo-devtools
```

Everything is MIT licensed. There are no tiers and nothing is paid.

## How the libraries are built

- **Small and focused.** One package solves one problem. Nothing here grows into a framework that
  wants to own your app's structure.
- **Dependency-light.** Adding a package should not add a supply chain. Where a package needs a
  library you may already have, you hand yours over instead of having a second copy installed.
- **Independently published.** Each one versions and ships on its own, with its own docs.
  Installing one never drags in another.
- **Honest about limits.** Every guide ends with what the thing cannot do, and why. A number that
  cannot be measured is left out rather than invented.

## Only shipped work appears here

Neither this site nor the docs carries a roadmap. A library shows up on the day it goes to npm and
not before. Work that has not shipped stays in the monorepo's `notes/plan.md`.

Naming a library on a public page is a promise, and there is nothing behind it until you can
install it.

## Why this repo exists

GitHub serves an organisation's root site **only** from a repository named exactly
`<org>.github.io`. That is this repo's whole job, and it owns `/` directly.

The docs used to be a second project site in their own repository. They are now this app's own
`/docs` route, a real path segment rather than one borrowed from a `basePath`, which is why
`next.config.mjs` sets none. One build, one deploy, one place to change a page.

## Running it locally

```sh
bun install
bun run dev          # next dev
bun run generate     # fetches the npm catalogue and syncs the changelogs
bun run build        # generate, then next build; writes out/
bun run start        # serves out/
bun run check-types  # next typegen && tsc --noEmit
bun run lint         # oxlint src
```

Next.js with `output: 'export'`, Fumadocs and Tailwind v4. There is no adapter and no SSR, because
GitHub Pages cannot run a server. `trailingSlash` is on so Pages resolves `/foo/` to
`/foo/index.html` rather than the `foo.html` an export would otherwise write.

Run `bun install` **here**, not at the monorepo root. This is not a workspace member, so the root
install, format, lint and build all skip it, and that is correct rather than a misconfiguration.

## The library list is not written by hand

`scripts/fetch-packages.mjs` runs before every build and asks npm what exists. Publish a package
and the next build puts it in the nav, the library grid, the footer and the stats. Unpublish one and
it disappears. Nothing to edit.

It reads two npm sources, because neither is enough on its own:

- the search endpoint carries descriptions and keywords, but its index lags a fresh publish
- the org listing is immediate, but lists packages outside the scope, so it gets filtered

Docs links are derived too. `@axonpack/x` becomes `/docs/x/`, so a new library needs no routing
entry anywhere.

Release notes work the same way. `scripts/sync-changelog.mjs` reads each library's `CHANGELOG.md`
from its published npm tarball, parses it into entries, and dates them from npm's publish times.
Those become both the blog and each package's `changelog.mdx`, which is why that file says not to
edit it by hand. A changeset that ships turns into a release entry with nothing to copy across.

GitHub is not used for any of this. Every source is a public npm endpoint, so the build needs no
credentials.

## Editing the words

The landing page's prose lives in `src/content.json`. Change it there, not in the markup. Anything
about the libraries themselves comes from npm and is not editable here.

Documentation lives in `content/docs/<package-slug>/`, one folder per package, with a `meta.json`
setting the sidebar order. The blog is generated from the changelogs, so you never write a post.

## How it deploys

`.github/workflows/deploy.yml` builds and publishes on push to `main`, and again on a daily cron so
versions and download counts stay current without a commit.

This needs **Settings → Pages → Source: GitHub Actions**. On the older "Deploy from a branch"
setting the workflow runs but publishes nothing.

## Layout

```
content/docs/          the documentation itself, one folder per package
src/
  app/                 routes: / , /docs/[[...slug]], /blog, llms.txt, og images
  components/          one component per file
  lib/
    constants/         tokens and path data
    services/          shape the generated and static data
    utils/             pure helpers
  content.json         the landing page's prose
  generated/           written by the fetch script, never committed
scripts/
  fetch-packages.mjs   asks npm what exists
  sync-changelog.mjs   turns published CHANGELOGs into changelog.mdx and the blog
legacy/                the previous no-build page, kept for reference
```

File names are kebab-case with a role suffix, matching the monorepo's `CONVENTIONS.md`.

## Product detail belongs in the docs

This page is about the project, not about any one library. What a tab does, how to call an API, what
an option means: that goes in the library's own docs. What belongs here is what is true of Axonpack
as a whole.

The palette matches the docs site on purpose, so the two do not read as different products.
