---
"@axonpack/preview": minor
---

- **Publish builds in a copy of the project**: `preview publish` copies the app's workspace root to a temp folder for each platform, installs there with a frozen lockfile, runs your `eas-build-pre-install` and `eas-build-post-install` scripts, builds the file sets and the bundle there, then deletes the copy in the background. Your folder isn't written to
- **What the copy holds**: every file, git-ignored ones such as `.env.local` included, except `node_modules`, `.expo` and native build output. A `.easignore` at the root leaves out more. A `.git` folder comes along, a git worktree's `.git` file doesn't
- **The copy's env**: its install, scripts, set builds and export get `EAS_BUILD=1`, `EAS_BUILD_PLATFORM`, `EAS_BUILD_WORKINGDIR`, `EAS_BUILD_GIT_COMMIT_HASH` and `PREVIEW_PUBLISH=1`, so a script can skip what only makes sense on EAS. `EAS_NO_FROZEN_LOCKFILE=1` installs without freezing the lockfile
- **`--in-place`** builds in the app's folder as before, with no copy, install or scripts. The CI sample workflows pass it
- **`--keep-copy`** keeps the copies in the temp folder, to look inside
- **`--environment` leaves nothing in `.eas/.env/`**: file-type variables go to publish's temp folder, and the export's own temp folder is deleted too
