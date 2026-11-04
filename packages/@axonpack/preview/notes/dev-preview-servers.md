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
- [x] Starts without a picked server that doesn't answer, and keeps it picked and listed as Offline until it does
- [x] Shows the hosts it checks, and lets QA add another computer's address on the device
- [x] Lists another computer's `preview start` servers through its registry, never its plain Expo servers
- [x] Takes the team's own computers from the app's config, and can hide adding one on the device
- [x] Off unless the app turns it on and `enabled` is on, and debug builds only
- [x] Only this app's servers, by the slug the config plugin bakes in; a build without it says so
- [x] Finds `preview start` servers on the device's own /24 with no address typed in, by asking each address for a registry
- [x] Lists a server found two ways once
- [x] Replaces an older registry, or one that hung, on its own
- [x] `preview start` prints the address a phone on the same Wi-Fi types in Add a host

## Turning it on

```ts
<PreviewProvider config={{ ...config, devPreviewServers: true }}>
```

It is one switch, off by default, off while `enabled` is false, and only shows in a debug build. A
release build never lists dev servers (user, 2026-11-04: QA switches between published previews
there). An object instead of `true`,
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
kind to whatever answers on its port. Before it spawns Expo, `start` notes the ports where this
project's Metro answers already (`projectMetros`), and never takes one of those: a leftover Metro of
the same project on 8081 was once registered for a start whose own Metro ran on 8083. It unannounces after Metro has exited, so the app's last look
never sees it answering unannounced. Heartbeats every 5 s keep it listed; it
drops out 15 s after the last, so a killed process goes too. Plain `expo start` servers are found
by probing the port range for Metro's `/status`; each one's Expo manifest then gives its slug,
name, version and bundle URL. A server found both ways (same host and port) uses the registry's details. While the list
is on screen and the app is in the foreground, it asks the registry, the servers already found, the
default Metro and the server it runs from every 2 s, and sweeps the whole range on open, on refresh
and every 30 s. Each closed port is a refused connection that iOS logs to the Xcode console, so the
sweep can't run every 2 s. It never starts a look while the last one runs. Off the list's screen,
the hook that says what runs sweeps once when it mounts, if the app runs from Metro and no server is
known yet, because only the registry says whether a server is a `preview start` one. A probe gives
up after 2 s: Android sends 5 requests per host at a time and the emulator takes about 400 ms to
refuse a closed port, so a tighter limit dropped live servers there. A closed port on the computer
itself fails at once, so the scan stays cheap.

**Other computers.** A host from the config or added on the device is never port scanned. The app
asks its registry (`http://<host>:19150/servers`, or the port given with it) and lists only the
servers it names, so a plain `expo start` on another computer never shows. Hosts added on the
device are saved in `Documents/preview/hosts.json`. A registry that does not answer, here or there,
is left out of the 2 s looks until the next full sweep, since every refused connection is one more
line in the Xcode console. Once Metro answers, `preview start` prints one line per private IPv4
address of the computer (`addHostLines` in `start.service.ts`, from the registry's `thisMachine`):
what to type in Add a host on a phone the sweep doesn't reach.

**An older registry.** `/servers` sends `version` (`REGISTRY_VERSION`); none counts as older. A
`start` that meets an older one, or one that holds 19150 but doesn't answer, finds its pid with
`lsof -nP -iTCP:19150 -sTCP:LISTEN -t`, and stops it only when `ps -ww -o command=` shows
`<script> registry --port <n>` and the script's real path is inside `@axonpack/preview`. SIGTERM,
then SIGKILL after 3 s. It then starts its own, and posts the old list to it, minus the servers whose
Metro `/status` no longer answers. A handed-over entry gets the usual 15 s TTL, so one whose `start`
is gone, with its Metro still up, drops out then. Anything else on the port, or no `lsof` (Windows), is left
running with a line saying what holds it. An older `start` keeps using a newer registry, and its
POST and DELETE are unchanged, so its heartbeat works with the new one. When an older `start`'s
failed heartbeat brings its own registry back in the gap and wins the port, the takeover runs once
more. A Metro on the first port of the range that no registry lists is never stopped, since it may
be the user's own `expo start`; `start` takes the next free port and says so.

**The network sweep.** While the list watches, the app asks its own network: native `localNetworks()` gives the device's private IPv4 addresses on `en*` (iOS,
`getifaddrs`) or `wlan*`/`eth*` (Android, `NetworkInterface`), each with its prefix length, so
cellular is never swept and no permission is needed to read them. `sweepRange`
(`src/utils/dev-preview-servers/subnet.util.ts`) turns each into the other addresses of its /24, or
of its smaller network when the prefix is longer, and `findRegistries` in `discover.service.ts` asks
each for `GET /servers` on 19150, 32 at a time with a 500 ms limit, through the same `readRegistry`
a typed host uses. What answers is kept in the store and passed to `discover` after the typed hosts,
so it is asked exactly like one from then on, every 2 s, and dropped from the 2 s looks once it stops
answering. It is not added to the Hosts list. The sweep runs on watch, on return to the foreground
and on refresh (not on the 2 s or 30 s ticks, and never off the list's screen), asks no new address
once the app goes to the background or the list closes, and only one runs at a time. A cut-short
sweep keeps the last full one's result. `discover` lists a computer reached twice once: a typed or
swept host whose registry gives this computer's machine id, or is one of the LAN addresses this
computer's registry reports (the Mac's LAN address typed in on the simulator), or gives a machine id
an earlier host already gave (a Mac on Wi-Fi and Ethernet, or a typed host the sweep found too).
This computer counts only while its registry answers in that look, so after
the USB cable is pulled its LAN address lists its servers. Typed hosts come first, so they win. Each refused address is one more `Could not connect to the server` line in
the Xcode console, so a sweep adds a burst there.

**Local network access.** A real iPhone asks once, the first time the app reaches past itself (the
sweep, a typed host). The plugin adds no `Info.plist` key for it; an app may set
`NSLocalNetworkUsageDescription` in `ios.infoPlist` for its own prompt text. Android 17 asks for
`ACCESS_LOCAL_NETWORK` like it does for Metro; up to API 36 `INTERNET` covers it.

**Offline.** The server the app runs from stays in the list when a look misses it, marked Offline,
with the title, branch and kind it had when it last answered. That is saved in
`Documents/preview/server.json`, so a reload still knows it. A server the app never saw answering
goes by its address, with a plain Server chip. A picked server the app started without stays listed
and Offline too, and the 2 s looks ask its port like the default Metro's, so it shows as soon as it
answers. Registry details are joined to what the scan found by
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
afterwards); iOS starts from the server's bundle URL. Native first asks the server's Metro for
`/status` (one second at most, since the start waits on it). With no answer, that start goes on to
the preview or the default and leaves the choice in `state.json`, because a stopped server would
leave the app at "Could not connect to development server" with no JS to switch back from. iOS asks
on every start and reload. Android asks once per start: dev support keeps the host its start set
through a dev-menu reload, and `onCreate` still points dev support when the server is down, to put the
developer's own host back. Switching to a preview clears the picked server, since
native would load the server first; "Back to default" clears both. A picked server that is the
Metro the app starts on anyway counts as the default. The server the app runs from is read from what the
app actually loaded, so the default's Metro shows Active too, not only one picked by hand.
Loopback names (`localhost`, `127.0.0.1`, the emulator's `10.0.2.2`) count as one machine.
