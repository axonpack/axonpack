# Dev preview servers

Several Metro servers for the same app, one per task or worktree, and one debug build that switches
between them live.

- [x] Lists every Metro server for this app on the developer's computer, in a debug build
- [x] Finds plain `expo start` servers, and servers started with `preview start` with their branch
- [x] Shows a new `preview start` server within 2 s, a plain one within 30 s, and drops one that stopped
- [x] Shows a spinner right after the heading during a full scan of the ports
- [x] Leaves out other apps' servers; keeps the same app built for other native code, marked
- [x] Switches the running app to a server with a tap on its row, and back, with no rebuild
- [x] Marks the server the app runs from as Active, and the one it starts on as the default
- [x] Says whether each server is a plain Expo server or one started with `preview start`
- [x] Starts Metro on a free port and announces it with one command, `preview start`
- [x] Asks for the name the app shows, prefilled from the branch (`--title` or no terminal skips it)
- [x] Keeps the server the app runs from in the list when it stops, marked Offline, with the name it last had
- [x] Shows the hosts it checks, and lets QA add another computer's address on the device
- [x] Lists another computer's `preview start` servers through its registry, never its plain Expo servers
- [x] Takes the team's own computers from the app's config, and can hide adding one on the device
- [x] Off unless the app turns it on, and debug builds only
- [x] Only this app's servers, by the slug the config plugin bakes in; a build without it says so
- [ ] Finds `preview start` servers on other computers on the network with no address typed in
- [ ] Lists and switches to dev servers in a release build too, when the app turns previews on

## Turning it on

```ts
<PreviewProvider config={{ ...config, devPreviewServers: true }}>
```

It is one switch, off by default, and only shows in a debug build. An object instead of `true`,
`{ enabled, allowCustomHosts, hosts }`, adds the team's own computers and can hide Add a host.
Otherwise the app probes ports 8081 to 8099, asks the registry on port 19150 (the same constant `preview start` uses, in
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
is on screen and the app is in the foreground, it asks the registry, the servers already found, the
default Metro and the server it runs from every 2 s, and sweeps the whole range on open, on refresh
and every 30 s. Each closed port is a refused connection that iOS logs to the Xcode console, so the
sweep can't run every 2 s. It never starts a look while the last one runs. A probe gives
up after 2 s: Android sends 5 requests per host at a time and the emulator takes about 400 ms to
refuse a closed port, so a tighter limit dropped live servers there. A closed port on the computer
itself fails at once, so the scan stays cheap.

**Other computers.** A host from the config or added on the device is never port scanned. The app
asks its registry (`http://<host>:19150/servers`, or the port given with it) and lists only the
servers it names, so a plain `expo start` on another computer never shows. Hosts added on the
device are saved in `Documents/preview/hosts.json`. A registry that does not answer, here or there,
is left out of the 2 s looks until the next full sweep, since every refused connection is one more
line in the Xcode console.

**Offline.** The server the app runs from stays in the list when a look misses it, marked Offline,
with the title, branch and kind it had when it last answered. That is saved in
`Documents/preview/server.json`, so a reload still knows it. A server the app never saw answering
goes by its address, with a plain Server chip. Registry details are joined to what the scan found by
host and port only, so a `preview start` server's name never lands on another server.

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
