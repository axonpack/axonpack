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
- [x] Finds `preview start` servers on other computers on the network with no address typed in
- [x] Says which computer a server found on the network runs on, and lists a server found two ways once
- [x] Replaces an older registry, or one that hung, on its own, and says when phones can't find the computer
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
line in the Xcode console.

**On the network.** The registry announces its servers over Bonjour as `_axon-preview._tcp` (a
service name takes 15 characters at most, so not `_axonpack-preview`). It lives in the registry, not
in each `preview start`, so one computer has one responder, and a server whose heartbeat stops gets
a goodbye too. No dependency: Node's `dgram` binds UDP 5353 with `reuseAddr` beside the system's own
responder, and a small writer in `src/utils/registry/mdns.util.ts` makes the PTR, SRV, TXT and A
records. It sends one packet per server on each LAN interface, with that interface's address in the
A record, announces twice a second apart, and answers any query for the type, an instance or its
host name after 20 to 120 ms, at most once a second. The instance name is `preview-<machine id>-<port>`
and the host name `axonpack-<machine id>.local`, both unique to the computer, so it skips the
probing step. TTLs are 120 s, so a killed registry ages out in two minutes. The machine id is a hash
of the host name and the LAN cards' MAC addresses: the same on every run, with no file. The TXT
record carries the title, branch, slug, app name, compatibility, native keys, registry port, machine
id and computer name. Expo's `_expo._tcp` is not browsed, so a plain `expo start` elsewhere never
shows. To check the packets with no network, write `announcement()`'s output into a pcap file
(raw IP) and read it with `tcpdump -nn -vvv -r`.

**Stopping and errors.** On SIGTERM, SIGINT, SIGHUP and the idle exit the registry sends a goodbye
for each server, waits at most 1 s for it, and closes. The registry runs detached with no terminal,
so a failed bind, or a round of sends where none got through, is kept as `announceError` in the
`/servers` answer (and the heartbeat's, which is why a POST answers 200 with the same body). One
interface failing alone, such as a VPN, is not reported. `preview start` prints it once, with the
Local Network fix on macOS for EHOSTUNREACH or EPERM, which is what a send without that access gets.

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

**Browsing.** Native browses only while the list watches and the app is in the foreground, and sends
JS the full list on every change. iOS uses `NWBrowser` and resolves a result by opening a
`NWConnection` to it, whose remote end is the address; Android uses `NsdManager`, one resolve at a
time, since before Android 14 a second one fails. Both report IPv4 only, as only an A record is
announced. A service macOS announces itself (`dns-sd -R`) also has an AAAA record: the iOS
connection is held to IPv4, or it would prefer IPv6, and Android 14 and up list the IPv4 addresses
first (`NsdService.getInetAddresses`). Each side logs what it skips under the `AxonpackPreview` tag
(logcat) or the `dev.axonpack.preview` subsystem, prefixed `Bonjour:`. JS keeps a Bonjour server
only when the build's slug matches and no registry already covers its computer: this computer (the
local registry's machine id, or one of the LAN addresses it reports, which is how the emulator's
`10.0.2.2` and the Mac's LAN address are one machine), a host typed in whose registry answered, or a
host the scan covers. A covered server that did not answer there in this look is asked at its
Bonjour address after the rest: a port `adb reverse` does not forward, or this computer after the
USB cable is pulled, when its registry is only remembered. The rest are merged like another
computer's registry, and the row shows the IP address and port like any other, with the computer's
name in a plain chip. A debug build logs once, with the `@axonpack/preview:` prefix, why a Bonjour
server has no row. The last answer of this
computer's registry is kept, since a quick look may skip it. A Bonjour name not seen before makes
the next look ask that registry even when it was quiet, so the first `preview start` shows as this
computer within 2 s. iOS needs `NSLocalNetworkUsageDescription` and `NSBonjourServices` listing
the type, added by hand to the app config for now (the example has them); the config plugin does
not add them yet.

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
