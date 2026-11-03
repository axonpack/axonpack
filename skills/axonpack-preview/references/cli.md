# preview CLI and app API reference

The full pages: https://axonpack.dev/docs/preview/cli and https://axonpack.dev/docs/preview/reference.

`preview` below stands for the form that fits the project: `npx preview`, `yarn preview`,
`pnpm exec preview` or `bunx preview`. Run it from the app's root, or pass `--project <dir>`.

## publish

Builds the app's JS bundle with `expo export:embed` and uploads it as a preview.

| Option                    | Default                      | What it does                                                                            |
| ------------------------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| `--id <id>`               | the git branch               | The preview's id. Publishing an id again replaces it, and devices show Update available |
| `--title <title>`         | asked, prefilled from the id | The name QA sees. A shell with no terminal, such as an agent's, isn't asked             |
| `--platform <p>`          | `all`                        | `android`, `ios` or `all`                                                               |
| `--base <branch>`         | the repo's default branch    | The branch the changelog counts commits from                                            |
| `--changelog=<text>`      | the commit subjects          | Use `=` when the text starts with a dash, as a `- item` list does                       |
| `--changelog-file <path>` |                              | Read the changelog from a file                                                          |
| `--entry-file <path>`     | Expo's own                   | Passed to `expo export:embed`                                                           |
| `--compatibility <c>`     | the plugin option            | `appVersion` or `fingerprint`. Overrides the app config, with a warning                 |
| `--environment <name>`    |                              | Build with an EAS environment's variables. Needs eas-cli, a login and a linked project  |

On success it prints, per platform, `<platform>: published <id> for build <key>` and the URL of
that build's index.

## The other commands

```sh
preview unpublish <id>          # off every list; its files stay until prune
preview prune                   # delete files no preview uses
preview start                   # Metro on a free port in 8081-8099, announced to the app
preview start --title "Login fix" --ports 8100-8120
preview start -- --clear        # after --, arguments go to expo start
```

A failed command prints `preview: <message>` and exits with 1. Through a `package.json` script run
with `bun run`, the first `--` is taken, so it is `bun run start:preview -- -- --clear`.

## Settings

`publish`, `unpublish` and `prune` read these from the environment first, then from the env files
Expo loads for a release build: `.env.production.local`, `.env.local`, `.env.production`, `.env`.
`start` needs none of them.

| Variable                       | Needed | What it is                                                     |
| ------------------------------ | ------ | -------------------------------------------------------------- |
| `PREVIEW_S3_URL`               | Yes    | `<endpoint>/<bucket>[/<folder>]`                               |
| `PREVIEW_S3_ACCESS_KEY_ID`     | Yes    | The write key's id                                             |
| `PREVIEW_S3_SECRET_ACCESS_KEY` | Yes    | Its secret                                                     |
| `PREVIEW_S3_REGION`            | No     | Signing region. Default `us-east-1`, which MinIO and R2 accept |

A preview's own `EXPO_PUBLIC_*` values are whatever the publishing machine has, so CI needs the
app's variables too.

## CI

Copy the sample GitHub Actions workflow for the app's lockfile into `.github/workflows/`:
`preview.npm.yml`, `preview.yarn.yml`, `preview.pnpm.yml` or `preview.bun.yml`, from
https://github.com/axonpack/axonpack/tree/main/packages/@axonpack/preview/ci/github-actions. It
publishes on every pull request and unpublishes when it closes. Set the `PREVIEW_S3_*` values as
repository secrets. https://axonpack.dev/docs/preview/ci has the details.

## App API

- `PreviewProvider` `config`: `enabled`, `url`, and for a private bucket `readAccessKeyId`,
  `readSecretAccessKey` and `region` from a read-only key. `devPreviewServers: true` lists this
  app's Metro servers in a debug build. `buildKey` replaces the plugin's key when the plugin can't
  be used.
- `<PreviewList />` takes `style`, `theme` (`mode`, colours, `radius`, `fonts`) and `labels`.
  `LIGHT_THEME`, `DARK_THEME` and `DEFAULT_LABELS` are exported.
- `usePreview()` gives `enabled`, `items`, `loading` and `refresh`, `download`, `switchTo(id)`,
  `switchTo(null)` for the base bundle, and `remove`, for a screen of your own.
- `useRunning()` says what this start runs (`kind` is `base`, `preview`, or `local` for a dev server), for a
  banner.

## Buckets

Any S3-compatible store: AWS S3, Cloudflare R2, MinIO and others. The app needs read access (a
public bucket, or a read-only key); the CLI needs a write key. Setup per host:
https://axonpack.dev/docs/preview/storage.
