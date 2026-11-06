# Bundles

Building a preview bundle, and which native build it can run on.

- [x] Builds the same release bundle and images the native build would embed, for Android and iOS
- [x] Builds in a throwaway copy of the project, with its own install and the EAS install scripts, so the developer's folder is never written to
- [x] Builds in the developer's folder instead when asked, for a CI checkout
- [x] Names a preview after its branch, with a readable title QA sees
- [x] Marks every preview with the native build it was made for, so an app only ever offers ones it can run
- [x] Lets the developer match previews to builds by app version (the default) or by native fingerprint

A preview is the output of `expo export:embed --bytecode`: Hermes bytecode plus the images next to
it, in the folders the native build uses. React Native finds images beside a bundle loaded from a
file, so nothing in JS has to map them.

`publish` exports in a copy of the project, per platform, the way an EAS build does
(`services/publish/copy.service.ts`). The copy is the app's workspace root, found with the app's own
`@expo/package-manager`, copied with `fs.cpSync` and a filter. Git-ignored files go in, since the
user asked for the folder as it is (`.env.local`, a built `web/out`); `.gitignore` isn't read. The
filter drops `SKIPPED` at any depth (`node_modules`, `.expo`, `ios/Pods`, `ios/build`,
`android/build`, `android/app/build`, `android/.gradle`) and what a root `.easignore` lists, matched
with `ignore` from `@expo/fingerprint` (a dependency of expo since SDK 53). Other generated folders
(`.next`, `dist`, a docs build) are copied unless `.easignore` lists them, and the docs say to list
them there when publish is slow. A `.git` folder is copied; a `.git` file (a worktree or submodule
pointer) isn't, because git in the copy would write to the real repository through it. The copy then
runs `eas-build-pre-install` (through npm under Yarn, as EAS does), the frozen install EAS runs for
that package manager (`EAS_NO_FROZEN_LOCKFILE` turns freezing off) and `eas-build-post-install`. The
end-of-build hooks never run. Every step in the copy gets `EAS_BUILD=1`, `EAS_BUILD_PLATFORM`,
`EAS_BUILD_WORKINGDIR`, `EAS_BUILD_GIT_COMMIT_HASH` (read from the user's folder) and
`PREVIEW_PUBLISH=1`, and never a build id, profile or runner, since there is none. The fingerprint,
app config and git info stay on the user's folder, as eas-cli computes them before upload. One copy
per platform, so each hook sees an honest `EAS_BUILD_PLATFORM`. Node can't clone files on APFS
(`COPYFILE_FICLONE_FORCE` is `ENOSYS`), so the copy is a plain one on macOS and Linux alike;
`COPYFILE_FICLONE` clones only where a file system can. `--in-place` exports in the user's folder
with no copy, install or hooks, and is what the CI samples pass, since a CI checkout is already a
clean copy. The run's temp folder holds the copies, each export (`<platform>-out`) and the EAS file
variables, and is deleted at the end, on failure and on Ctrl-C, unless `--keep-copy`. Deleting a
copy with its `node_modules` takes about 20 s, so once a platform is published its copy is renamed
out of the run folder to `<run>-<platform>` and deleted by a detached `process.execPath -e` running
`fs.rmSync` (`removeInBackground`), which publish doesn't wait for. The rename keeps the run
folder's own delete from reaching into it. A copy whose platform failed is still deleted before the
error is printed.

Bytecode runs only on a build with the same native code and the same Hermes version. Each build
gets a key, and the app lists only previews published under its own key. The developer picks how
the key is made, with one option in the app config that the build and `publish` both read:

```json
"plugins": [["@axonpack/preview", { "compatibility": "appVersion" }]]
```

| `compatibility`        | Key                     | Pick it when                                                                                               |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `appVersion` (default) | `version-<app version>` | You bump the version for every native change. Simple, and readable in the bucket                           |
| `fingerprint`          | `fingerprint-<hash>`    | Native changes can land without a version bump. Exact, the same hash expo-updates' fingerprint policy uses |

The trade-off of `appVersion`: a native change without a version bump is not detected, so a preview
built on the old native code is still offered. Two things catch most of the damage: a preview whose
Hermes bytecode version differs from the build's is not loaded, and a preview that fails while
starting falls back to the default bundle and is marked broken. `publish` prints a one-line warning in
this mode. With `fingerprint`, any native change (a new native dependency, a config plugin change,
a prebuild with different settings) makes older previews incompatible.

A preview chosen on one build is not started by a later build with another key; the app starts the
default bundle and the download moves to Incompatible.
