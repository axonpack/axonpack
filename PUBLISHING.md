# Publishing

This repo publishes to npm with [Changesets](https://github.com/changesets/changesets). Normally
that happens by running the "Release" GitHub Action manually (see
[`.github/workflows/release.yml`](./.github/workflows/release.yml)). This doc is the same process,
run by hand from your own machine, for when you don't want to go through GitHub.

## Prerequisites

- You're logged in to npm with publish access to the `@bruin` scope: `npm whoami` should print
  your username. If not, `npm login` first.
- An npm token with publish rights, exported in your shell:
  ```sh
  export NPM_TOKEN=npm_xxxxxxxxxxxx
  ```
  This is required even if you're already logged in via `npm login` — the repo's `.npmrc` points
  the registry auth at `$NPM_TOKEN` specifically, so without it set, publishing will fail auth
  regardless of your local npm login.
- You're on `main`, up to date, with no uncommitted changes.

## Steps

1. **Make sure every change has a changeset.** If you already added one with `bunx changeset add`
   when you made the change, skip this. Otherwise, run it now and follow the prompts (pick the
   package, pick a bump level, write a plain-language summary):

   ```sh
   bunx changeset add
   ```

2. **See what's about to happen.**

   ```sh
   bunx changeset status
   ```

   This lists which package(s) have pending changesets and what bump level each will get. If it
   says there's nothing pending, there's nothing to release — stop here.

3. **Version the packages.** This bumps each affected package's `package.json` version, writes the
   changelog entry into that package's `CHANGELOG.md`, and deletes the changeset file(s) it just
   applied:

   ```sh
   bun run version-packages
   ```

   Look at the diff (`git diff`) before continuing — this is your last chance to catch a wrong
   bump level or a changelog typo.

4. **Commit the version bump.** Normally a `pre-commit` hook blocks committing straight to `main`
   — that's intentional for regular work, but the same rule would also block this release commit.
   Skip hooks for this one commit only:

   ```sh
   HUSKY=0 git add .
   HUSKY=0 git commit -m "release: version packages"
   ```

5. **Build and publish.**

   ```sh
   bun run release
   ```

   This runs `turbo run build` (compiles `@bruin/devtools`'s `src` → `build`, which is what
   actually gets published) followed by `changeset publish`, which pushes to npm any package whose
   version isn't live on the registry yet, and tags each one it publishes
   (e.g. `@bruin/devtools@0.2.0`) as a local git tag.

6. **Push the commit and the tags.**

   ```sh
   git push origin main
   git push origin --tags
   ```

   The tags step matters — `changeset publish` only creates tags locally; without this they'd
   never reach GitHub.

## Notes

- `@bruin/linter` and `devtools-example` never publish — both are `"private": true`, and
  Changesets skips private packages automatically. You won't be prompted for them in step 1, and
  they're excluded from versioning and publishing in every step above.
- Verify a publish landed with `npm view @bruin/devtools version` or by checking
  [npmjs.com/package/@bruin/devtools](https://www.npmjs.com/package/@bruin/devtools).
