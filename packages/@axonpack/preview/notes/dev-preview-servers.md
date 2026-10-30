# Dev preview servers

Several Metro servers for the same app, one per task or worktree, and one debug build that switches
between them live.

- [x] Lists every Metro server for this app on the developer's computer, in a debug build
- [x] Finds plain `expo start` servers, and servers started with `preview start` with their branch
- [x] Shows a new server within about two seconds, and drops one that stopped
- [x] Leaves out other apps' servers; keeps the same app built for other native code, marked
- [x] Switches the running app to a server with a tap on its row, and back, with no rebuild
- [x] Marks the server the app runs from as Active, and the one it starts on as the default
- [x] Says whether each server is a plain Expo server or one started with `preview start`
- [x] Starts Metro on a free port and announces it with one command, `preview start`
- [x] Asks for the name the app shows, prefilled from the branch (`--title` or no terminal skips it)
- [x] Off unless the app turns it on, and never in a release build
- [x] Only this app's servers, by the slug the config plugin bakes in; a build without it says so

## Turning it on

```ts
<PreviewProvider config={{ ...config, devPreviewServers: true }}>
```

It is one switch, off by default, and only shows in a debug build. Nothing else is set: the app probes
ports 8081 to 8099, asks the registry on port 19150 (the same constant `preview start` uses, in
`src/constants/dev-preview-servers/dev-preview-servers.const.ts`), looks on the host its own Metro is on (plus `10.0.2.2` on the
Android emulator), and lists only servers for the slug the config plugin baked into the build. A
build made without the plugin has no slug, and the section says so instead of listing anything.

## How it works

**Running it.** In the example, `bun run start:preview` (or `bunx preview start`).

**The name.** In a terminal, `preview start` asks for the name the app's list shows, prefilled with
the branch's readable title (`task-1-login-fix` becomes "Task 1 login fix"). Enter keeps it, or edit
it first. `--title <name>` skips the question, and so does a run with no terminal (CI, an AI agent),
which takes the branch title. `publish` asks the same way for the title QA sees.

**Two sources.** `preview start` runs `expo start` on a free port and announces it to a small
registry on the computer (started by the first `start`, gone once no server is left), with the
branch, worktree and the native key `publish` would use. It announces only once Metro answers, on
the port whose `/status` names its project root (`X-React-Native-Project-Root`), because Expo moves
to another port when it finds the given one taken, and the app gives an announcement's title and
kind to whatever answers on its port. It unannounces after Metro has exited, so the app's last look
never sees it answering unannounced. Heartbeats every 5 s keep it listed; it
drops out 15 s after the last, so a killed process goes too. Plain `expo start` servers are found
by probing the port range for Metro's `/status`; each one's Expo manifest then gives its slug,
name, version and bundle URL. A server found both ways (same host and port) uses the registry's details. While the list
is on screen the app looks every 2 s, and never starts a look while the last one runs. A probe gives
up after 2 s: Android sends 5 requests per host at a time and the emulator takes about 400 ms to
refuse a closed port, so a tighter limit dropped live servers there. A closed port on the computer
itself fails at once, so the scan stays cheap.

**Which servers.** Only the app's own slug, which the config plugin bakes into the build. A server
for the same app but another native key (another app version, or another fingerprint) is listed and
marked, since a developer may still want it. A plain server in fingerprint mode shows "native build
unknown", because its manifest does not carry a fingerprint.

**Reaching it.** The app probes the host its own Metro is on. On the Android emulator it also tries
`10.0.2.2`, which reaches the computer with no `adb reverse`. A phone on USB needs `adb reverse`,
which `preview start` runs for its port and the registry's when `adb` is on the PATH. A phone
on Wi-Fi was started from the computer's LAN address, so the same rule finds the others.

**Switching.** The choice is stored next to the preview choice and never changes it. On every start
of a debug build the dev preview server wins, then a downloaded preview, then the default Metro. Android
points React Native's dev support at the server (and puts the developer's own dev-menu host back
afterwards); iOS starts from the server's bundle URL. Switching to a preview clears the picked server, since
native would load the server first; "Back to default" clears both. A picked server that is the
Metro the app starts on anyway counts as the default. The server the app runs from is read from what the
app actually loaded, so the default's Metro shows Active too, not only one picked by hand.
Loopback names (`localhost`, `127.0.0.1`, the emulator's `10.0.2.2`) count as one machine.

## Won't do

- Run in a release build. There is no Metro there, and a release build ignores the setting even if it
  is in the saved state.
