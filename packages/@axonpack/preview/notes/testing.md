# Testing

Running the example end to end on your own machine, with no cloud account.

- [x] A local S3 server (MinIO) with a public and a private bucket, started with one command
- [x] An example app (the default `create-expo-app` template, tabs) with the list on a Previews tab
- [x] A banner on every tab that says what runs: a dev preview server, a preview, or the base bundle
- [x] Links that do what the list's buttons do, so a run can be scripted from a terminal

## Run the example end to end

From `packages/@axonpack/preview`, after `bun install` at the repo root.

1. Start Docker, or Podman with `podman machine start`.
2. Start the local S3 server:
   ```sh
   bun run storage:local
   ```
3. Copy the two settings files. `.env` holds the app's settings. `.env.local` holds the publish
   settings with the write key; uncomment its lines after copying. Both are gitignored.
   ```sh
   cp example/.env.example example/.env
   cp example/.env.local.example example/.env.local
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

6. Publish a preview from `example/`:
   ```sh
   bun run publish:preview --id task-1-login-fix --changelog="- Fixes the login"
   ```
   That publishes for Android and iOS. In a terminal it asks for the title, prefilled from the id;
   Enter keeps it.
   `bunx preview publish …` works too. Use `bunx` in this repo, not `npx`: `npx` can't read
   bun's install, so it looks for a `preview` package on npm and fails with a 404. An app
   installed with npm uses `npx`.
7. In the app's Previews tab: Refresh, Download, Switch, then Back to base. The banner at the top
   names what runs. Publish the same id again with other
   changes to see "Update available", or `bunx preview unpublish <id>` to see "Unpublished".
8. Stop everything:
   ```sh
   cd .. && bun run storage:local:stop
   podman machine stop   # if you use Podman
   ```

The example also takes links, which run the same code as its buttons:
`previewexample://download/<id>`, `switch/<id>`, `switch/embedded`, `refresh`, `delete/<id>`,
`deleteincompatible`, `local/<port>` and `localstop`. Each one lands on the Previews tab
(`src/app/+native-intent.tsx`). Open them with `xcrun simctl openurl booted <link>` or
`adb shell am start -d <link>`.

## Several tasks at once (people and AI agents)

One debug build of the example can run any of several Metro servers, one per task or worktree. The
app needs `devPreviewServers: true` (the example has it).

1. In each worktree, start Metro with:
   ```sh
   bun run start:preview                # picks a free port in 8081-8099 and announces it
   bun run start:preview -- -- --clear  # after the second --, args go to expo start (bun eats the first)
   ```
   In a terminal it asks for the name the app shows, prefilled from the branch; Enter keeps it.
   `--title <name>` skips the question, and so does a run with no terminal.
   A plain `npx expo start --port 8085` is found as well, with less detail (no branch).
2. Open the Previews tab in the app. "Dev preview servers" shows each server for this app within about two
   seconds, with its branch, port and version. Switch runs that server; "Stop using dev preview server"
   goes back.
3. Stop a server with Ctrl+C; it leaves the list on its own.

On the Android emulator nothing else is needed. A phone on USB needs `adb reverse` for each port;
`preview start` does it when `adb` is on the PATH. See [dev-preview-servers.md](./dev-preview-servers.md).

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
