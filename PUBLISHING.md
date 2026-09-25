# Publishing

This repo publishes to npm with [Changesets](https://github.com/changesets/changesets), from the
Release workflow in [`.github/workflows/release.yml`](./.github/workflows/release.yml). Nobody
publishes from a laptop in the normal course of things. This doc covers what the workflow does, the
one-time setup it depends on, and the fallback for when GitHub is not an option.

## The normal path

There is nothing to run. The workflow reacts to merges into `main`.

1. **Every change that should ship carries a changeset.** `bun run changeset` from the root, pick
   the packages and the bump level, write the entry for the person using the library.
2. **A PR with a changeset merges.** Two jobs run at once:
   - **Canary Release** publishes every package with a pending changeset under the `canary`
     dist-tag, versioned `<next version>-canary-<commit>`. The version bump happens in the runner
     only; nothing is committed and the changeset files stay on `main`.
   - **Release PR** opens or refreshes the Version Packages PR on the `changeset-release/main`
     branch: `package.json` bumps, `CHANGELOG.md` entries and the refreshed `bun.lock`. Nothing is
     published to `latest`.
3. **More PRs merge.** Each one publishes a fresh canary and force-updates the Version Packages PR,
   so it always describes what is on `main`. Do not edit that branch by hand; the next merge
   overwrites it. To fix a changelog line, fix the changeset file on `main` through a normal PR.
4. **A maintainer merges the Version Packages PR.** The workflow recognises it by its branch name.
   Its merge leaves no changesets, so **Stable Release** builds, publishes to `latest`, and pushes
   the `@axonpack/<name>@<version>` tags. Nothing else ever publishes to `latest`.

A PR with no changeset publishes nothing when it merges. A direct push to `main` runs nothing.

### Running it by hand

Actions → Release → Run workflow, on `main`, and pick a channel:

- `canary`: snapshot and publish whatever changesets are pending. Useful after a failed canary run.
- `stable`: refresh the Version Packages PR if changesets are pending, otherwise build and publish
  to `latest`. This is how to retry a stable publish that failed, for example after fixing the npm
  settings below, without a new commit.

## One-time setup

**npm trusted publishing.** There is no npm token in the repo or in GitHub secrets. npm trusts
`release.yml` in `axonpack/axonpack` and hands each run a short-lived token. Set it once per
package on npmjs.com, under **Settings** → **Trusted publishing** → **GitHub Actions**:

- Organization or user: `axonpack`
- Repository: `axonpack`
- Workflow filename: `release.yml`
- Environment: leave empty

Do this for `@axonpack/expo-devtools`, `@axonpack/react-pretty-print` and
`@axonpack/react-native-devtools-tab`, and for any new package after its first publish. npm only
offers the setting on a package that already exists, so a brand-new package goes out once by hand
(see below). Until the setting is in place the publish step fails with
`403 OIDC permission denied`.

**GitHub Actions may open pull requests.** Repository **Settings** → **Actions** → **General** →
"Allow GitHub Actions to create and approve pull requests". Without it the bot can push the
`changeset-release/main` branch but cannot open the Version Packages PR.

**Branch protection on `main`.** Require a pull request and the CI check. The bot never pushes to
`main` directly, so it needs no bypass. This is what makes "merge equals release" safe.

**pkg.pr.new app**, for the `preview` label in CI. Install it on the repo once. It publishes a PR's
packages to its own registry for testing, never to npm.

## Provenance

Every version the workflow publishes carries a provenance attestation, which anyone can check with:

```sh
npm audit signatures
```

A version published from a laptop has no provenance. That is the main reason to prefer the workflow,
and to use the manual `stable` run rather than a local publish when something needs retrying.

## Publishing from a machine

Only for a brand-new package's first publish, or when GitHub itself is unavailable.

Prerequisites:

- `npm whoami` prints a user with publish access to the `@axonpack` scope. If not, `npm login`.
- The package still allows token publishing. If **Publishing access** on npmjs.com disallows tokens,
  only the workflow can publish it.
- A clean checkout of `main`, up to date.

Steps:

1. **See what is pending.**

   ```sh
   bunx changeset status
   ```

2. **Version on a branch.** `main` is PR-only, so the bump goes through a PR like any other change.
   This also refreshes `bun.lock`, which records each workspace's version.

   ```sh
   git switch -c release/version-packages
   bun run version-packages
   git add .
   git commit -m "release: version packages"
   git push -u origin release/version-packages
   ```

   Open the PR, read the diff (this is the last look at the bump levels and the changelog), merge
   it. Its merge has no changesets left and is not the bot's branch, so the workflow publishes
   nothing on its own.

3. **Publish.** Prefer the workflow: run it by hand with `channel: stable`, and you get provenance.
   Only if that is not possible, from an up-to-date `main`:

   ```sh
   bun run release
   git push origin --tags
   ```

   `bun run release` builds every package and runs `changeset publish`, which publishes any package
   whose version is not on the registry yet and tags it locally. The tags only reach GitHub with
   the second command.

## Notes

- `linter` and the example apps never publish. They are `"private": true`, and Changesets skips
  private packages everywhere: prompts, versioning and publishing.
- Canary versions sort below every stable release, so `^3.2.0` never resolves to one. They are
  installed on purpose only: `bun add @axonpack/expo-devtools@canary`.
- Check what is live with `npm view @axonpack/expo-devtools dist-tags`, which lists `latest` and
  `canary` side by side.
