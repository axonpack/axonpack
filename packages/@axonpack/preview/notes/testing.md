# Testing

Running the example end to end on your own machine, with no cloud account.

- [x] A local S3 server (MinIO) with a public and a private bucket, started with one command
- [x] An example app that lists, downloads and switches previews against it
- [x] Previews that each look different, so it is obvious which one is running
- [x] A preview that crashes on purpose, to try the fallback
- [x] Links that do what the list's buttons do, so a run can be scripted from a terminal

## Run the example end to end

From `packages/@axonpack/preview`, after `bun install` at the repo root.

1. Start Docker, or Podman with `podman machine start`.
2. Start the local S3 server:
   ```sh
   bun run storage:local
   ```
3. Copy the two settings files. `.env` is read when the app is bundled; `.env.preview` is read
   only by the publish command and holds the write key.
   ```sh
   cp example/.env.example example/.env
   cp example/.env.preview.example example/.env.preview
   ```
4. Build and run the example, in a debug or a release build:
   ```sh
   cd example
   npx expo run:ios      # or: npx expo run:ios --configuration Release
   npx expo run:android  # or: npx expo run:android --variant release
   ```
5. Make sure the device reaches the server:
   - iOS simulator: `localhost` works as it is.
   - Android emulator, or a phone on USB: `adb reverse tcp:9000 tcp:9000`, once each time the device
     starts.
   - Phone on the same Wi-Fi: put the computer's LAN IP in `EXPO_PUBLIC_PREVIEW_S3_URL`.
   - Phone on another network: a public tunnel to port 9000 (see [storage.md](./storage.md#the-example-app)).

   `EXPO_PUBLIC_*` values are built into the bundle, so after changing one run
   `npx expo start --clear`, or rebuild for a release build.

6. Publish a preview from `example/`. Each label gives it a look of its own:
   ```sh
   EXPO_PUBLIC_BUNDLE_LABEL=task-1-login-fix \
     bunx preview publish --id task-1-login-fix --changelog="- Fixes the login"
   ```
   That publishes for Android and iOS. `EXPO_PUBLIC_BUNDLE_LABEL=crash-on-start` gives a
   preview that throws while it loads.
   Use `bunx` in this repo: `npx` can't read bun's install, so it looks for a `preview`
   package on npm and fails with a 404. An app installed with npm uses `npx`.
7. In the app: Refresh, Download, Switch, then Back to base. Publish the same id again with other
   changes to see "Update available", or `bunx preview unpublish <id>` to see "Unpublished".
8. Stop everything:
   ```sh
   cd .. && bun run storage:local:stop
   podman machine stop   # if you use Podman
   ```

The example also takes links, which run the same code as its buttons:
`previewexample://download/<id>`, `switch/<id>`, `switch/embedded`, `refresh`, `delete/<id>`
and `deleteincompatible`. Open them with `xcrun simctl openurl booted <link>` or
`adb shell am start -d <link>`.

## Several tasks at once (people and AI agents)

One debug build of the example can run any of several Metro servers, one per task or worktree. The
app needs `localServers: { enabled: true }` (the example has it).

1. In each worktree, start Metro with:
   ```sh
   bunx preview start            # picks a free port in 8081-8099 and announces it
   bunx preview start -- --clear # anything after -- goes to expo start
   ```
   A plain `npx expo start --port 8085` is found as well, with less detail (no branch).
2. Open the list in the app. "Local servers" shows each server for this app within about two
   seconds, with its branch, port and version. Switch runs that server; "Stop using local server"
   goes back.
3. Stop a server with Ctrl+C; it leaves the list on its own.

On the Android emulator nothing else is needed. A phone on USB needs `adb reverse` for each port;
`preview start` does it when `adb` is on the PATH. See [local-servers.md](./local-servers.md).

## Troubleshooting

- **"Expected JSON from … but got text/html"**: something other than the bucket answered. The URL is
  not public, or a tunnel is showing its login page. Make the tunnel public, or use `localhost` with
  `adb reverse`.
- **The list is empty**: nothing is published for this build's key. With the default
  `compatibility: "appVersion"` the key is the app version, so publish again after a version bump.
  With `"fingerprint"`, a prebuild or any native or app config change gives a new key, so publish
  again after the build you are running.
- **Android cannot connect**: the `adb reverse` was lost when the emulator or phone restarted, or the
  app was refused local network access (Android 17 asks). Run `adb reverse` again, or allow the
  permission in the app's settings.
