# Storage

Where previews are kept: in the bucket they are published to, and on the device once downloaded.

- [ ] Reads previews from any S3-compatible bucket (S3, R2, MinIO and others), public or private (with a read-only key)
- [ ] Downloads a preview into the app's documents folder and checks every file
- [ ] Keeps a download until QA deletes it; nothing expires on a timer
- [ ] Shows downloads made for another native build apart, with one button to delete them all

A half-finished download is never offered, because it only becomes a preview once every file has
been checked.

## Publishing settings

`preview-ready publish` reads these from `.env` in the app's root, then from the environment. A
variable set in the environment wins over the file, so CI can pass its secrets without one. `.env`
is gitignored; `example/.env.example` shows the local values.

| Variable                             | Needed | What it is                                                                                                                 |
| ------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `PREVIEW_READY_S3_ENDPOINT`          | yes    | S3 API address: `https://<account>.r2.cloudflarestorage.com`, `https://s3.<region>.amazonaws.com`, `http://localhost:9000` |
| `PREVIEW_READY_S3_BUCKET`            | yes    | Bucket name. Objects are addressed path-style: `<endpoint>/<bucket>/<key>`                                                 |
| `PREVIEW_READY_S3_REGION`            | no     | Signing region. Default `us-east-1`; `auto` on R2                                                                          |
| `PREVIEW_READY_S3_ACCESS_KEY_ID`     | yes    | Write key id. Never ship it in the app                                                                                     |
| `PREVIEW_READY_S3_SECRET_ACCESS_KEY` | yes    | Write key secret                                                                                                           |
| `PREVIEW_READY_S3_PUBLIC_URL`        | no     | Where public reads go when that is not `<endpoint>/<bucket>`, such as R2's `r2.dev` address. Only printed by the CLI       |

None of them starts with `EXPO_PUBLIC_`, so Expo never puts them into a bundle.

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

A file is at `<endpoint>/<bucket>/<path>`. The address a device uses for the endpoint:

| Device                  | Endpoint                               |
| ----------------------- | -------------------------------------- |
| Android emulator        | `http://10.0.2.2:9000`                 |
| iOS simulator           | `http://localhost:9000`                |
| Phone on the same Wi-Fi | `http://<your computer's LAN IP>:9000` |

### Plain HTTP on a device

The local server has no TLS. A release build on Android refuses plain HTTP to any host unless the
app allows cleartext traffic, so downloads fail with a cleartext error, while a debug build works.
The example app will turn cleartext on in its own config when downloads land, never in the
package's defaults. A real app should use HTTPS. iOS does not apply App Transport Security to IP
addresses or `localhost`, so the simulator and a phone using the LAN IP should work as they are
(to be checked on a device in the download phase).

Android 17 also asks the user before an app may reach the local network, which includes the
emulator's `10.0.2.2` and a LAN IP (the `ACCESS_LOCAL_NETWORK` permission). If it is denied, both
downloads from the local server and a debug build's connection to Metro fail. On the emulator,
`adb shell pm grant <package> android.permission.ACCESS_LOCAL_NETWORK` grants it.
