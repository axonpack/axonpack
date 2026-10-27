# Distribution

Publishing a preview so installed apps can find it.

- [x] Publishes a preview from the developer's machine with one command
- [x] Replaces a preview when the same branch is published again
- [x] Gives every preview a changelog, from the branch's commits unless one is passed in
- [x] Keeps one list per native build for the app, and one list of everything for people
- [x] Removes a preview, and cleans up files nothing uses any more
- [x] Runs against a local S3 server while developing

Previews go to an S3-compatible bucket: S3, R2, MinIO or any other host with the S3 API. The app
gets the endpoint, the bucket and, for a private bucket, a read-only key from the config it passes
in.

## Commands

Run from the app's root (`--project <dir>` otherwise). `preview --help` lists every option.

```sh
npx preview publish                  # id = git branch, both platforms
npx preview publish --id task-1 --changelog="- Fixes the login"
npx preview unpublish task-1
npx preview prune
```

`publish` builds with `expo export:embed --dev false --bytecode`, the same step a release build
runs, so the bundle is Hermes bytecode with its images beside it. It reads the `compatibility`
option from the app config (see [bundles.md](./bundles.md)), builds the same key the app was built
with, records the app version and the native fingerprint either way, uploads each file once under
its sha256, writes the preview's manifest, and only then adds it to the lists. `--compatibility`
overrides the option, with a warning, since a build of the app would then not list the preview. An app never sees a preview whose files
are not all there. The changelog is the commit subjects since the branch left the base branch
(`--base`, default: the repo's default branch); `--changelog=<text>` or `--changelog-file` replace it.

## Layout

```
index.json                            every native build and its previews, for people
index/<platform>/<key>.json           what one native build can run; the app reads this
previews/<platform>/<key>/<id>.json   one preview's manifest: files, changelog, versions
files/<sha256>                        bundle and image blobs, shared between previews
```

`<key>` is `version-1.0.0` or `fingerprint-<hash>`. Every manifest and index entry also records the
compatibility setting, the app version and the native fingerprint, so `index.json` can group builds
by version whichever setting made them.

```

```

Both lists are read, changed and written back only if nobody wrote in between (`If-Match` on the
ETag, or `If-None-Match: *` for a new file). A clash reads again and retries, so two publishes at
once both end up listed. `unpublish` leaves files in place; `prune` deletes the ones no manifest uses.
