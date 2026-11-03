---
name: axonpack-preview
description: Set up @axonpack/preview in an Expo app and prove it works, then publish a JS bundle per branch or pull request to an S3-compatible bucket and let QA switch to it inside the installed app with no native rebuild, using the `preview` CLI. Use when the project depends on @axonpack/preview, or when the user wants per-PR preview builds of the JS, a QA list of previews in the app, to publish, unpublish or prune previews, a GitHub Actions workflow for them, an S3, R2 or MinIO bucket for them, or several Metro servers (one per worktree) switched live in a debug build.
---

# @axonpack/preview

`preview publish` builds the app's JS bundle and uploads it to the user's own S3-compatible bucket,
under a key baked into the native build. QA opens `<PreviewList />` in the installed app, picks a
preview, and the app restarts into it. **Back to base** returns to the build's own bundle.

## Set it up

Do the steps in order. Each ends with a check; don't go on until it passes.

1. **Find the package manager.** Look for a lockfile in the app's folder, or the nearest parent
   folder that has one. Use that manager for everything and never add a second lockfile.

   | Lockfile                | Manager | Runner (`<x>` below) |
   | ----------------------- | ------- | -------------------- |
   | `package-lock.json`     | npm     | `npx`                |
   | `yarn.lock`             | yarn    | `yarn`               |
   | `pnpm-lock.yaml`        | pnpm    | `pnpm exec`          |
   | `bun.lock`, `bun.lockb` | bun     | `bunx`               |

   No lockfile at all: ask the user which one they use.

2. **Check the versions** in `package.json` and the app config.
   - `expo` 53 or newer and `react-native` 0.79 or newer. Older: the package can't work there; ask
     the user before upgrading the SDK.
   - The New Architecture and Hermes. On SDK 53 and 54, `newArchEnabled` must not be `false` and
     `jsEngine` must not be `jsc`. Under the old architecture it only warns and always loads the base
     bundle.
   - On an iOS 27 simulator or device, the app needs Expo SDK 58 or newer.

3. **Install** the package and its peer:

   ```sh
   <x> expo install @axonpack/preview expo-file-system
   ```

   Check: `<x> preview --help` prints the commands.

4. **Add the config plugin.** In `app.json`, add it to `expo.plugins` (create the array if missing).
   In `app.config.ts` or `app.config.js`, add the same entry to the `plugins` array it returns.

   ```json
   {
     "expo": {
       "plugins": [["@axonpack/preview", { "compatibility": "appVersion" }]]
     }
   }
   ```

   `compatibility` is what previews are keyed on: `appVersion` (the default) or `fingerprint` (the
   native fingerprint). The app lists only previews made for its own key.
   Check: `<x> expo config --type public` prints the config. It fails when the plugin isn't found.

5. **Mount the provider and the list.** `PreviewProvider` goes around everything the root returns:
   `src/app/_layout.tsx` or `app/_layout.tsx` with Expo Router, otherwise the component `main`
   registers, usually `App`. Mount it on every start, also where `enabled` is false, and never
   behind a login or a lazy screen: it tells the native side the start worked.

   ```tsx
   import { PreviewProvider } from "@axonpack/preview";

   export default function RootLayout() {
     return (
       <PreviewProvider
         config={{
           enabled: process.env.EXPO_PUBLIC_PREVIEWS === "on",
           url: process.env.EXPO_PUBLIC_PREVIEW_S3_URL ?? "",
         }}
       >
         {/* what this component returned before, unchanged */}
       </PreviewProvider>
     );
   }
   ```

   Put `<PreviewList style={{ flex: 1 }} />` on a screen QA can reach, such as a `previews.tsx`
   route with Expo Router. Ask the user where they want it: a tab in internal builds, a settings
   row, a hidden gesture.
   Check: `<x> tsc --noEmit` passes.

6. **Set the env values.** Ask the user for the bucket; never invent one. No bucket yet: the
   [quick start](https://axonpack.dev/docs/preview/quick-start) runs a local MinIO.
   - The app, in `.env`: `EXPO_PUBLIC_PREVIEW_S3_URL=<endpoint>/<bucket>` and
     `EXPO_PUBLIC_PREVIEWS=on` for builds QA uses. A private bucket also needs a **read-only** key,
     passed as `readAccessKeyId`, `readSecretAccessKey` and `region`.
   - The CLI, in `.env.local` or CI secrets: `PREVIEW_S3_URL`, `PREVIEW_S3_ACCESS_KEY_ID`,
     `PREVIEW_S3_SECRET_ACCESS_KEY`, and optionally `PREVIEW_S3_REGION` (default `us-east-1`).
   - The write key never goes in an `EXPO_PUBLIC_*` variable, the app config or a committed file:
     Expo builds `EXPO_PUBLIC_*` into the bundle.

   Check: `.gitignore` covers `.env*.local` (`git check-ignore .env.local` prints it).

7. **Make a native build.** It has native code, so Expo Go can't run it, and the plugin only takes
   effect in a new build: `<x> expo prebuild`, then `<x> expo run:ios` or `<x> expo run:android`,
   or EAS Build. After moving to SDK 58 for iOS 27, use `<x> expo prebuild --clean -p ios`: a stale
   `ios/` folder crashes at launch.
   Check: `grep -A1 AxonpackPreviewKey ios/*/Info.plist` shows the key, such as `version-1.0.0`.
   On Android, `grep dev.axonpack.preview.KEY android/app/src/main/AndroidManifest.xml`.

8. **Verify.** `<x> preview publish --id setup-check --title "Setup check"` ends with
   `<platform>: published setup-check for build <key>` per platform, and `<key>` matches step 7.
   Then ask the user to open the list in the app and tap Refresh: **Setup check** is there. Clean
   up with `<x> preview unpublish setup-check` and `<x> preview prune`.

## Setup problems

- **"This build has no compatibility key".** The build predates the plugin. Rebuild (step 7).
- **An empty list.** The build key and the published key differ: compare step 7 with what publish
  printed. With `appVersion` a version bump needs a new publish; with `fingerprint` any native or
  app config change does.
- **Publish says to set `PREVIEW_S3_URL`.** The CLI found no settings. Step 6.
- **"No git branch to name the preview after".** A detached HEAD, as on CI. Pass `--id`.
- **`npx preview` gives a 404 in a bun project.** Use `bunx preview`.
- **The bucket answers 403.** The app has no read key for a private bucket, or the key lacks
  `s3:ListBucket`, or the region is wrong; or the CLI's key can't write. See
  https://axonpack.dev/docs/preview/storage.
- **Android can't reach a local server.** Run `adb reverse tcp:9000 tcp:9000` after each device
  start, or use the computer's LAN address on a phone. A release build also refuses plain HTTP.
- **Switch does nothing.** The native code wasn't rebuilt after the package was added or updated.
- **A preview shows as Broken.** It failed before the provider mounted: an error in that branch, or
  a provider behind a login or a lazy screen. The next start loads the base bundle.

More: https://axonpack.dev/docs/preview/troubleshooting.

## Use it

```sh
preview publish                          # id from the git branch, both platforms
preview publish --id task-1 --title "Login fix" --platform android
preview unpublish <id>                   # off every list; files stay until prune
preview prune                            # delete files no preview uses
preview start                            # Metro on a free port, announced to the app
```

- Publishing an id again replaces it, and devices show **Update available**.
- In a shell with no terminal, such as an agent's, `publish` doesn't ask for a title.
- `usePreview()` gives the list and its actions for a screen of your own; `useRunning()` says what
  this start runs, for a banner. `devPreviewServers: true` lists this app's Metro servers in a
  debug build, one per worktree with `preview start`.

Every flag, the CI workflows and the app API: [references/cli.md](references/cli.md).

## Docs

- Quick start, against a local MinIO: https://axonpack.dev/docs/preview/quick-start
- Storage and the two keys: https://axonpack.dev/docs/preview/storage
- Settings and env files: https://axonpack.dev/docs/preview/environment
- App setup: https://axonpack.dev/docs/preview/app-setup
- CI: https://axonpack.dev/docs/preview/ci
- Troubleshooting: https://axonpack.dev/docs/preview/troubleshooting
