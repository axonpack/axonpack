# Storage

Where previews are kept: in the bucket they are published to, and on the device once downloaded.

- [ ] Reads previews from any S3-compatible bucket (S3, R2, MinIO and others), public or private (with a read-only key)
- [ ] Downloads a preview into the app's documents folder and checks every file
- [ ] Keeps a download until QA deletes it; nothing expires on a timer
- [ ] Shows downloads made for another native build apart, with one button to delete them all

A half-finished download is never offered, because it only becomes a preview once every file has
been checked.

## Settings

Publishing and the app never share a file, so the write key cannot end up inside an app.

| File                 | Read by                                   | What goes there                                                                                  |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `.env.preview-ready` | `preview-ready publish`, and nothing else | The bucket URL and the **write** key (`PREVIEW_READY_S3_*`). Gitignore it                        |
| `.env`               | Expo, when it bundles the app             | The bucket URL and, for a private bucket, a **read-only** key (`EXPO_PUBLIC_PREVIEW_READY_S3_*`) |

Expo loads `.env`, `.env.local` and `.env.<mode>` when it bundles and builds `EXPO_PUBLIC_*` values
into the app. `.env.preview-ready` is none of those, so Expo never reads it. The CLI reads only that
file and the environment, never `.env` or `EXPO_PUBLIC_*`. The example has
`example/.env.preview-ready.example` and `example/.env.example` with the local values.

### Publish settings

A variable set in the environment wins over the file, so CI can pass its secrets without one.

| Variable                             | Needed | What it is                                                                                                                                                                               |
| ------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PREVIEW_READY_S3_URL`               | yes    | `<endpoint>/<bucket>`, plus a folder inside the bucket if there are more segments: `http://localhost:9000/previews-public`, `https://<account>.r2.cloudflarestorage.com/previews/my-app` |
| `PREVIEW_READY_S3_ACCESS_KEY_ID`     | yes    | Write key id. Never ship it in the app                                                                                                                                                   |
| `PREVIEW_READY_S3_SECRET_ACCESS_KEY` | yes    | Write key secret                                                                                                                                                                         |
| `PREVIEW_READY_S3_REGION`            | no     | Signing region. Default `us-east-1`, which MinIO and R2 accept                                                                                                                           |
| `PREVIEW_READY_S3_PUBLIC_URL`        | no     | Where public reads of the bucket go when that is not `<endpoint>/<bucket>`, such as R2's `https://pub-<id>.r2.dev`. The CLI only prints it; the app takes the same value as `publicUrl`  |

The names are the package's own, not `AWS_*`, so they work the same for any S3-compatible host and
never pick up AWS keys already exported in a shell.

## Set up local storage

A local S3 server, so you can try both bucket modes without a cloud account. It is MinIO, with one
public-read bucket and one private bucket plus a read-only key. Every name, key and the port live in
`local-s3/local-s3.env`, and both setups below read that file. The keys are local test values only.

### With Docker (main path)

Needs Docker: Docker Desktop or OrbStack on macOS, the Docker engine on Linux. Podman's Docker
socket works too. From `packages/@axonpack/preview-ready`:

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
2. In one terminal, from `packages/@axonpack/preview-ready/local-s3`:
   `set -a; . ./local-s3.env; set +a; minio server ./data --address ":$LOCAL_S3_PORT"`
3. In another, from the same folder:
   `set -a; . ./local-s3.env; set +a; LOCAL_S3_URL="http://localhost:$LOCAL_S3_PORT" sh ./init.sh`

`init.sh` is the same script the Docker setup runs, so the buckets, policy and key come out the same.

### What you get

| Value          | Local test value                                                                      |
| -------------- | ------------------------------------------------------------------------------------- |
| Endpoint       | `http://localhost:9000`, region `us-east-1`, path-style URLs                          |
| Public bucket  | `previews-public`: anyone can read, only the write key can write                      |
| Private bucket | `previews-private`: reads need the read key, signed with SigV4                        |
| Write key      | `preview-ready-admin` / `preview-ready-admin-secret` (MinIO's root user)              |
| Read key       | `preview-ready-reader` / `preview-ready-reader-secret` (read `previews-private` only) |

A file is at `<endpoint>/<bucket>/<path>`.

### The example app

The example reads its bucket from `example/.env` (copy `example/.env.example`):

| Variable                                              | What it is                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `EXPO_PUBLIC_PREVIEW_READY_S3_URL`                    | The same `<endpoint>/<bucket>` the previews are published to                  |
| `EXPO_PUBLIC_PREVIEW_READY_S3_READ_ACCESS_KEY_ID`     | Only for a private bucket: the read-only key (`preview-ready-reader` locally) |
| `EXPO_PUBLIC_PREVIEW_READY_S3_READ_SECRET_ACCESS_KEY` | Its secret (`preview-ready-reader-secret` locally)                            |

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
