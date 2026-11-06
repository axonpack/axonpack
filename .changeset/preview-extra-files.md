---
"@axonpack/preview": minor
---

- **Files with a preview**: name a folder in the config plugin's `files` option, such as `{ "www": "web/dist" }`, and `preview publish` uploads it with each preview. The app downloads it with the bundle and checks every file
- **A build command per file set**: `{ "www": { "folder": "web/out", "build": "npm run build:web" } }` runs the command before publishing, with the `--environment` values, so the files and the bundle use the same variables
- **`usePreviewFiles(name)` and `previewFilesPath(name, config)`**: give the folder that goes with the running bundle, the preview's own copy or the app's default from the preview config's `files`, and `ready`, false until the set's `onPostDownload` has run on start
- **`onPostDownload(name, uri, { previousUri })`**: runs your own step, such as a path rewrite, once each time a preview's copy finishes downloading. On iOS it runs again after an app update moved the app's folder, with the old folder as `previousUri`
- **Downloads go four files at a time**, so a preview with a large web export comes down faster
- **The list shows file sets**: a preview row names its sets and their size, and Show details says which copy of each set is in use. New labels `files`, `filesPreview` and `filesDefault`
- **A changed web build shows Update available**, since the files count toward the preview's revision
