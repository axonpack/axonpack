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

Run from the app's root (`--project <dir>` otherwise). `preview-ready --help` lists every option.

```sh
npx preview-ready publish                  # id = git branch, both platforms
npx preview-ready publish --id task-1 --platform android --changelog="- Fixes the login"
npx preview-ready unpublish task-1
npx preview-ready prune
```

`publish` builds with `expo export:embed --dev false --bytecode`, the same step a release build
runs, so the bundle is Hermes bytecode with its images beside it. It then takes the native
fingerprint with the app's own `@expo/fingerprint`, uploads each file once under its sha256, writes
the preview's manifest, and only then adds it to the lists. An app never sees a preview whose files
are not all there. The changelog is the commit subjects since the branch left the base branch
(`--base`, default: the repo's default branch); `--changelog=<text>` or `--changelog-file` replace it.

## Layout

```
index.json                                   every native build and its previews, for people
index/<platform>/<fingerprint>.json          what one native build can run; the app reads this
previews/<platform>/<fingerprint>/<id>.json  one preview's manifest: files, changelog, versions
files/<sha256>                               bundle and image blobs, shared between previews
```

Both lists are read, changed and written back only if nobody wrote in between (`If-Match` on the
ETag, or `If-None-Match: *` for a new file). A clash reads again and retries, so two publishes at
once both end up listed. `unpublish` leaves files in place; `prune` deletes the ones no manifest uses.
