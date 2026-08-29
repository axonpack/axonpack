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

`.github/workflows/docs.yml` builds on every pull request that touches `apps/docs/**`, and deploys to
GitHub Pages on push to `main`.

The site is a project site (`https://axonpack.github.io/axonpack`), so it is served under a path
prefix rather than a domain root. `NEXT_PUBLIC_BASE_PATH` carries that prefix; the workflow derives
it from the repo name, and local dev runs without it.

Two things depend on it that are easy to miss:

- `next.config.mjs` passes it to `basePath`, which is what prefixes every route, link and asset.
- `src/components/search.tsx` builds the search index URL from it by hand. Fumadocs reads its own base
  path from `import.meta.env.BASE_URL`, a Vite convention Next does not set, so without this the index
  would be fetched from the domain root and 404.

## Search

There is no search server. `src/app/api/search.json/route.ts` exports `staticGET`, so the whole index
is serialized at build time into `out/api/search.json` (~1.2 MB, ~240 KB gzipped, one entry per
heading). `src/components/search.tsx` fetches it **on the first query**, not on page load or when the
dialog opens, hydrates it in the browser and answers every keystroke locally.

The route is named `search.json`, not `search`, because GitHub Pages types and compresses a file by
its extension. Extensionless it is served as `application/octet-stream` and uncompressed — the same
index at five times the transfer.

### Scoped to one package

Every entry is tagged with its root folder — which is its tab, which is its package — by the
`buildIndex` in that route. `src/components/search.tsx` reads the current package out of the pathname
and opens search already filtered to it, with a row of tags in the dialog footer to switch package or
clear the filter and search everything.

Adding a library needs nothing here: the tag comes from `page.slugs[0]`, and the footer is built from
`searchTags` in `src/lib/packages.ts`.

Note that this fixes _relevance_, not weight — one index still covers every package, and the whole
file is downloaded whichever tag is active. That is the right trade at this size. If it ever gets too
big to ship, the next steps in order are: one index file per package fetched on demand, or a hosted
index (Orama Cloud, Algolia). Both keep the site static; only `search.tsx` changes.

**To move to a custom domain**, drop both `NEXT_PUBLIC_*` variables from the workflow and add
`public/CNAME`. Nothing else changes.

`public/.nojekyll` is required: without it Pages runs Jekyll, which ignores every directory starting
with an underscore — including `_next`.

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
