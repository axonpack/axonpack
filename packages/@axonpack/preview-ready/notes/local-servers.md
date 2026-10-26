# Local servers

Several Metro servers for the same app, one per task or worktree, and one debug build that switches
between them live.

- [x] Lists every Metro server for this app on the developer's computer, in a debug build
- [x] Finds plain `expo start` servers, and servers started with `preview-ready start` with their branch
- [x] Shows a new server within about two seconds, and drops one that stopped
- [x] Leaves out other apps' servers; keeps the same app built for other native code, marked
- [x] Switches the running app to a server, and back, with no rebuild
- [x] Starts Metro on a free port and announces it with one command, `preview-ready start`
- [x] Off unless the app turns it on, and never in a release build

## Turning it on

```ts
<PreviewReadyProvider config={{ ...config, localServers: { enabled: true } }}>
```

| Option         | Default                        | What it is                                            |
| -------------- | ------------------------------ | ----------------------------------------------------- |
| `enabled`      | off                            | Shows the "Local servers" section (debug builds only) |
| `ports`        | `[8081, 8099]`                 | Ports probed for Metro servers                        |
| `registryPort` | `19150`                        | Where `preview-ready start` announces servers         |
| `host`         | the host the app's Metro is on | The computer as the device sees it                    |
| `slug`         | the slug baked into the build  | Only servers for this slug are listed                 |

## How it works

**Two sources.** `preview-ready start` runs `expo start` on a free port and announces it to a small
registry on the computer (started by the first `start`, gone once no server is left), with the
branch, worktree and the native key `publish` would use. Heartbeats every 5 s keep it listed; it
drops out 15 s after the last, so a killed process goes too. Plain `expo start` servers are found
by probing the port range for Metro's `/status`; each one's Expo manifest then gives its slug,
name, version and bundle URL. A server found both ways uses the registry's details. While the list
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
which `preview-ready start` runs for its port and the registry's when `adb` is on the PATH. A phone
on Wi-Fi was started from the computer's LAN address, so the same rule finds the others.

**Switching.** The choice is stored next to the preview choice and never changes it. On every start
of a debug build the local server wins, then a downloaded preview, then the default Metro. Android
points React Native's dev support at the server (and puts the developer's own dev-menu host back
afterwards); iOS starts from the server's bundle URL. "Stop using local server" brings back what ran
before, a chosen preview included; "Back to base" stops both.

## Won't do

- Run in a release build. There is no Metro there, and a release build ignores the setting even if it
  is in the saved state.
