# Storage

Where previews are kept: in the bucket they are published to, and on the device once downloaded.

- [ ] Reads previews from any S3-compatible bucket (S3, R2, MinIO and others), public or private (with a read-only key)
- [ ] Downloads a preview into the app's documents folder and checks every file
- [ ] Keeps a download until QA deletes it; nothing expires on a timer
- [ ] Shows downloads made for another native build apart, with one button to delete them all

A half-finished download is never offered, because it only becomes a preview once every file has
been checked.

## Settings

Publishing reads its settings the way Expo reads the app's: from the environment, then the same
`.env*` files Expo loads for a release bundle. Only `EXPO_PUBLIC_*` values are built into the app,
so the write key, which has no such prefix, never ends up inside it.

| Variable                   | Read by                       | What it holds                                                                     |
| -------------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `PREVIEW_S3_*`             | `preview publish` only        | The bucket URL and the **write** key                                              |
| `EXPO_PUBLIC_PREVIEW_S3_*` | Expo, when it bundles the app | The bucket URL and, for a private bucket, a **read-only** key. Built into the app |

The CLI never reads `EXPO_PUBLIC_*`. The example has `example/.env.example` (the app's settings)
and `example/.env.local.example` (the publish settings) with the local values.

### Publish settings

CI has no settings file, so the environment comes first: the shell, or the CI job's secrets. For
publishing from your own machine they can go in an env file instead. Publish loads the files
`expo export:embed --dev false` loads (mode `production`), through the app's own `@expo/env`, so the
order and the `${VAR}` expansion are Expo's:

1. `.env.production.local`
2. `.env.local`
3. `.env.production`
4. `.env`

A variable set in the environment wins over every file, and the first file in the list wins over
the ones after it. `.env.development*` and other modes are not read. `EXPO_NO_DOTENV` turns the
files off here too.

Put the write key in `.env.local` or `.env.production.local`, which Expo's project template
gitignores (`.env*.local`), or in CI secrets. Never put it in a committed `.env`: anyone with the
repo could then write to the bucket.

| Variable                       | Needed | What it is                                                                                                                                                                               |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PREVIEW_S3_URL`               | yes    | `<endpoint>/<bucket>`, plus a folder inside the bucket if there are more segments: `http://localhost:9000/previews-public`, `https://<account>.r2.cloudflarestorage.com/previews/my-app` |
| `PREVIEW_S3_ACCESS_KEY_ID`     | yes    | Write key id. Never ship it in the app                                                                                                                                                   |
| `PREVIEW_S3_SECRET_ACCESS_KEY` | yes    | Write key secret                                                                                                                                                                         |
| `PREVIEW_S3_REGION`            | no     | Signing region. Default `us-east-1`, which MinIO and R2 accept                                                                                                                           |

The names are the package's own, not `AWS_*`, so they work the same for any S3-compatible host and
never pick up AWS keys already exported in a shell.

## Set up local storage

For the whole run, from starting the server to switching previews in the app, see
[testing.md](./testing.md).

A local S3 server, so you can try both bucket modes without a cloud account. It is MinIO, with one
public-read bucket and one private bucket plus a read-only key. Every name, key and the port live in
`local-s3/local-s3.env`, and both setups below read that file. The keys are local test values only.

### With Docker (main path)

Needs Docker: Docker Desktop or OrbStack on macOS, the Docker engine on Linux. Podman's Docker
socket works too. From `packages/@axonpack/preview`:

| Command                       | Does                                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| `bun run storage:local`       | Starts MinIO, then creates the buckets and the read key. Safe to rerun |
| `bun run storage:local:stop`  | Stops it. Uploaded files stay in `local-s3/data/` (gitignored)         |
| `bun run storage:local:reset` | Stops it and deletes `local-s3/data/`, so the next start is empty      |

MinIO stopped publishing its own images in 2025, so `local-s3/compose.yaml` uses Bitnami's frozen
copies, pinned by digest.

### Without Docker

1. `brew install minio/stable/minio minio/stable/mc` (not tried here: MinIO's own downloads changed
   in 2025, so this tap may be gone).
2. In one terminal, from `packages/@axonpack/preview/local-s3`:
   `set -a; . ./local-s3.env; set +a; minio server ./data --address ":$LOCAL_S3_PORT"`
3. In another, from the same folder:
   `set -a; . ./local-s3.env; set +a; LOCAL_S3_URL="http://localhost:$LOCAL_S3_PORT" sh ./init.sh`

`init.sh` is the same script the Docker setup runs, so the buckets, policy and key come out the same.

### What you get

| Value          | Local test value                                                          |
| -------------- | ------------------------------------------------------------------------- |
| Endpoint       | `http://localhost:9000`, region `us-east-1`, path-style URLs              |
| Public bucket  | `previews-public`: anyone can read, only the write key can write          |
| Private bucket | `previews-private`: reads need the read key, signed with SigV4            |
| Write key      | `preview-admin` / `preview-admin-secret` (MinIO's root user)              |
| Read key       | `preview-reader` / `preview-reader-secret` (read `previews-private` only) |

A file is at `<endpoint>/<bucket>/<path>`.

### The example app

The example reads its bucket from `example/.env` (copy `example/.env.example`):

| Variable                                        | Needed | What it is                                                                                                                                                                       |
| ----------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_PREVIEW_S3_URL`                    | yes    | With a read key, the same `<endpoint>/<bucket>` the previews are published to. Without one, any address they are public under: that URL, R2's `https://pub-<id>.r2.dev` or a CDN |
| `EXPO_PUBLIC_PREVIEW_S3_READ_ACCESS_KEY_ID`     | no     | Only for a private bucket: the read-only key (`preview-reader` locally)                                                                                                          |
| `EXPO_PUBLIC_PREVIEW_S3_READ_SECRET_ACCESS_KEY` | no     | Its secret (`preview-reader-secret` locally)                                                                                                                                     |
| `EXPO_PUBLIC_PREVIEW_S3_REGION`                 | no     | Signing region for a private bucket. Default `us-east-1`; `auto` on R2                                                                                                           |

With a read key the app splits the URL into endpoint, bucket and folder and signs its reads. Without
one it reads `<url>/<key>` unsigned, so the URL needs no bucket in it.

Headers for a tunnel or proxy are not env values: pass `headers` in the app's config.

Expo builds `EXPO_PUBLIC_*` values into the app, so only a read-only key may go there, never the
write key. They are read when the app is bundled, so rebuild after changing them.

The address `localhost:9000` works as it is on the iOS simulator. On the Android emulator, run
`adb reverse tcp:9000 tcp:9000` once per emulator start, so the emulator's `localhost:9000` reaches
this computer. On a phone, use the computer's LAN address instead (`http://<LAN IP>:9000/...`), in
both the publish URL and the app's URL.

A tunnel works too, for a phone on another network: forward port 9000 (a VS Code dev tunnel, for
example) and put its HTTPS address in the app's URL, while publishing stays on `localhost:9000`. The
tunnel must be public, or it answers every request with a redirect to a login page. Dev tunnels may
also put a warning page in front of the first request; pass
`headers: { "X-Tunnel-Skip-AntiPhishing-Page": "True" }` in the app's config to skip it.

### Plain HTTP on a device

The local server has no TLS. A release build on Android refuses plain HTTP to any host unless the
app allows cleartext traffic, so downloads fail with a cleartext error, while a debug build works.
The example app turns cleartext on in its own config (`expo-build-properties`,
`android.usesCleartextTraffic`), never in the package's defaults. A real app should use HTTPS. iOS does not apply App Transport Security to IP
addresses or `localhost`, so the simulator and a phone using the LAN IP should work as they are
(to be checked on a device in the download phase).

Android 17 also asks the user before an app may reach the local network, which includes the
emulator's `10.0.2.2` and a LAN IP (the `ACCESS_LOCAL_NETWORK` permission). If it is denied, both
downloads from the local server and a debug build's connection to Metro fail. On the emulator,
`adb shell pm grant <package> android.permission.ACCESS_LOCAL_NETWORK` grants it.
