# axonpack-docs

The documentation site for the `@axonpack/*` libraries, at
[`apps/docs`](https://github.com/axonpack/axonpack/tree/main/apps/docs).

[Next.js](https://nextjs.org) + [Fumadocs](https://fumadocs.dev), built as a **static export** and
hosted on GitHub Pages. Pages are MDX under `content/docs`.

## Running it

From the **repo root**, so bun's workspace linking resolves:

```sh
bun install
```

Then, from this directory:

```sh
bun run dev          # http://localhost:3000
bun run build        # static export into ./out
bun run start        # serve ./out, to check the export rather than the dev server
bun run lint         # oxlint src
bun run check-types  # next typegen && tsc --noEmit
```

`turbo run dev --filter=axonpack-docs` from the root does the same thing.

## One folder per package, everywhere

This site documents several independent libraries, not one product with several sections. So the
**package is the top-level axis**, and its slug is repeated identically in every place that holds
something belonging to it:

| Path                   | Holds                                               |
| ---------------------- | --------------------------------------------------- |
| `content/docs/<slug>/` | That package's pages, and only that package's       |
| `public/<slug>/`       | That package's screenshots and other assets         |
| `/docs/<slug>/...`     | Its routes                                          |
| `src/lib/packages.ts`  | One entry per package — name, slug, status, summary |

Nothing is shared between two libraries by accident, and a package can be removed by deleting one
folder in each column. The only tab that is not a package is `content/docs/overview/`, which is what
is true of the project as a whole.

### Adding a library

1. Add an entry to `src/lib/packages.ts` with `status: 'shipped'`. The landing page, the roadmap
   page, the nav and the `<PackageCards />` component all read from there — no second list to update.
2. Create `content/docs/<slug>/meta.json` with `"root": true`, a `title` of the full npm name, a
   one-line `description` and an `icon`. That is what makes it a tab in the sidebar switcher.
3. Create `content/docs/<slug>/index.mdx` as the package overview, and list every page in `meta.json`.
4. Put its images under `public/<slug>/`.

Copy the shape of `content/docs/expo-devtools/` — `---Get started---` / `---Guides---` /
`---Shipping---` separators, then a `reference/` subfolder that collapses in the sidebar.

A **planned** package gets an entry in `packages.ts` with `status: 'planned'` and a section on
`content/docs/overview/roadmap.mdx`, and no tab. A tab that leads to one "not built yet" page is
noise, and this mirrors the repo's own rule in `notes/plan.md`: a package that does not exist yet
keeps its intent bullets on the plan page until the day it does.

## Where the rest lives

| Path                      | What is in it                                                        |
| ------------------------- | -------------------------------------------------------------------- |
| `content/docs/meta.json`  | The tab order.                                                       |
| `*/meta.json`             | The sidebar. **A page not listed there does not appear.**            |
| `src/app/(home)/page.tsx` | The landing page.                                                    |
| `src/app/docs/page.tsx`   | `/docs` itself, which bounces to the overview.                       |
| `src/lib/shared.ts`       | Site name, GitHub coordinates, and the llms.txt / OG route prefixes. |
| `src/components/mdx.tsx`  | Every component an `.mdx` page may use without importing it.         |

## Deployment

The site is served from the **organisation root**, `https://axonpack.github.io`. Only a repo named
exactly `<org>.github.io` gets that URL — a project repo can only ever be served at
`https://axonpack.github.io/<repo>`. So the site is built here and its output is pushed to
`axonpack/axonpack.github.io`, which holds nothing but build output.

`.github/workflows/docs.yml` builds on every pull request that touches `apps/docs/**`, and on push to
`main` force-pushes `apps/docs/out` to that repo. Its history is replaced on every deploy rather than
appended to, so **nothing in that repo should ever be hand-edited** — the next deploy discards it.

### One-time setup

1. Create the repo `axonpack/axonpack.github.io`, public and empty.
2. Generate a deploy key:
   `ssh-keygen -t ed25519 -C axonpack-docs-deploy -f ./pages_deploy -N ""`
3. In **axonpack.github.io** → Settings → Deploy keys → Add deploy key: paste `pages_deploy.pub` and
   tick **Allow write access**.
4. In **axonpack/axonpack** → Settings → Secrets and variables → Actions → New repository secret:
   name `PAGES_DEPLOY_KEY`, value the contents of `pages_deploy` (the private half).
5. In **axonpack.github.io** → Settings → Pages → Source: **Deploy from a branch**, `main` / `(root)`.
6. Delete both local key files.

`public/.nojekyll` is what makes step 5 work: without it Pages runs Jekyll, which ignores every
directory starting with an underscore — including `_next`.

### Base paths

A root site has no path prefix, so `NEXT_PUBLIC_BASE_PATH` is unset everywhere and every URL is
root-relative. It stays wired up because the day the site moves under a subpath, that prefix has to
reach **two** places and only one is automatic:

- `next.config.mjs` passes it to `basePath`, which prefixes every route, link and asset.
- `src/components/search.tsx` builds the search index URL from it by hand. Fumadocs reads its own base
  path from `import.meta.env.BASE_URL`, a Vite convention Next does not set, so without this the index
  would be fetched from the wrong origin and every search would come back empty.

Both are declared in `turbo.json`'s `build.env`, so a cached build is never reused across prefixes.

**To move to a custom domain**, drop `NEXT_PUBLIC_SITE_URL` from the workflow and add
`public/CNAME`. Nothing else changes.

## Conventions

Borrowed from how Expo writes its own docs, because they hold up:

- **Sentence case headings.** Product names keep their capitals; nothing else does.
- **Register every new page** in the `meta.json` of its folder, in the position you want it in the
  sidebar. `---Label---` entries are section separators.
- **Frontmatter is `title` plus `description`.** `title` is both the page's H1 and its sidebar label,
  so keep it short enough to read in a 250px column. The description is the page subtitle, the OG
  image subtitle and the search snippet, so write it as a sentence about the page.
- **Follow the sibling.** A new page in a `reference/` folder should read like the one next to it.
- **Every claim comes from the source**, not from another document. The package's `README.md` and
  `REFERENCE.md` were the starting point for this content, and both had drifted from the code in
  places.
- **State the limits.** Each guide ends with what the thing cannot do, and why. That is a feature of
  this project's writing, not a disclaimer to trim.

Prettier is configured here (`.prettierrc`) to match the scaffold's style, so the repo's root `format`
task does not rewrite it. It does not reach `.mdx` at all — the root glob is `**/*.{ts,tsx,md}`.
