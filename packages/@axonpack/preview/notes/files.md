# Files

Folders that go with a preview beside its bundle, such as the web app a WebView shows.

- [x] Names folders in the config plugin, so publish and the app read one app config
- [x] Publishes each folder with every preview, uploading only the files the bucket doesn't have
- [x] Runs a set's own build command before publishing it, with the `--environment` values
- [x] Counts the folders in the preview's revision, so a changed web build shows Update available
- [x] Downloads them with the bundle, four files at a time, each file checked, all or nothing
- [x] Tells the app which copy goes with the running bundle: the preview's own, or the app's default
- [x] Runs the app's own step on a preview's copy once each time it finishes downloading
- [x] Runs that step again when an app update moved the app's folder (iOS), with the old folder, and tells the app when the copy is ready
- [x] Shows each preview's folders and their size in the list, and which copy is in use under Show details
- [ ] One preview's JS with another copy of the files, picked in the list
- [ ] Folders from a dev preview server
- [ ] Reusing the files a new revision didn't change instead of downloading them again

A file set is a name and a folder, in the plugin's `files` option: `{ "www": "web/dist" }`, or a
name and `{ "folder": "web/dist", "build": "<command>" }`. The plugin itself ignores it; only
`preview publish` reads it. A `build` runs once, before the folders are read and before the bundle,
in a shell from the project root with `stdio: "inherit"` and the CLI's env. After `--environment`
that env holds the EAS values (`applyEasEnv` puts them on `process.env`), so a web export gets the
same variables as the bundle, minus secret-visibility ones, which `eas env:pull` never returns. A
command that exits non-zero stops the publish, naming the set and the command. There is no copy of
the project and no package.json hook: the command is the whole contract. It hashes every file in the folder and
adds them to the same file list as the bundle, at `files/<name>/<path>`, so the upload, the
manifest, the revision, `prune`, the download, the sha256 check and the `.partial` rename all work
on them with no code of their own. The manifest and the index entry also get `fileSets`, each set's
file count and size, for the list. A preview with no sets is written exactly as before, so its
revision doesn't change.

On the device the files land in `preview/<id>/<platform>/files/<name>/`. The download runs four
requests at a time over the bundle's files and the sets' together, from one shared queue. After the
first failure no new file starts, and the ones on the way are awaited before the `.partial` folder
is deleted, so none of them writes into it afterwards. A build made with 0.2.0 downloads them too
and never reads them.

The app says where its own copy is (`files.<name>.default` in the preview config), because only it
knows how it embeds the folder: Android assets, a copy in Documents, anything. `previewFilesPath`
returns the running preview's folder when it has the set, else that default. It reads what native
says it loaded, not what was chosen, the same way the header card does, so the files can't follow
a preview the app didn't start. What runs changes only with a restart, so the hook reads it once
per mount.

The package never changes the files. `onPostDownload(name, uri, { previousUri })` runs after the
rename, so the app's step sees the folder the files stay in: a path rewrite writes that folder into
them. It runs before the download's record is written, with `previousUri` undefined, and a step that
throws deletes the download, so a half-changed copy is never used. The record
(`<id>/<platform>.json`) keeps the folder each set's `onPostDownload` ran with, as
`onPostDownloadUris`.

On iOS the app's container can move when the app is updated, and a new QA build with the same
version keeps the preview chosen. So the provider runs a check once per start, for the running
preview only: each set with an `onPostDownload` whose recorded folder isn't the current one gets
`onPostDownload(name, uri, { previousUri: <recorded> })`, then the new folder is recorded. A
download recorded before the set had an `onPostDownload` has no folder for it, so it gets the
first-run call. Until the check settles, `previewFilesPath` returns the preview's copy with
`ready: false`, and the hooks render again when it does; a set without `onPostDownload` and the
default copy are always ready. If `onPostDownload` throws on start, the download is deleted (the
files may be half changed), the error goes to the list, and the preview shows as not downloaded. The
running preview's sets stay `ready: false` until the next start, which loads the app's own bundle
because the bundle file is gone. Its images are gone for the rest of that run too.

With `compatibility: "fingerprint"`, the fingerprint hashes the app config with the plugin options,
so adding or changing `files`, a `build` command included, changes the build key and needs a
rebuild.

The example names `web/` as the `content` set and reads `content.json` on its Home tab. It has no
native folder of its own, so its default copy is written to Documents from the bundle on first
start, where a real app would embed it in the native build.
