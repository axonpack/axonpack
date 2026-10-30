---
"@axonpack/preview": minor
---

- **Servers found on the network**: a teammate's `preview start` on the same Wi-Fi shows in the dev servers list with no address typed in. `preview start` announces it over Bonjour, and a plain `expo start` is never announced
- **Each row says which computer**: a server found on the network shows its IP address and port like any other row, and its computer's name in a chip, so two computers on port 8081 are two rows. `DevPreviewServer` has `machine`
- **One row per server**: a server found on `localhost` and over Bonjour, or through a host you added, shows once. The registry's `/servers` also gives the computer's id and LAN addresses
- **iOS asks first**: add `NSLocalNetworkUsageDescription`, and `NSBonjourServices` with `_axon-preview._tcp`, to the app's `ios.infoPlist`. iOS then asks the user once
- **An older registry is replaced**: `preview start` replaces a registry from an older version on port 19150, or one that stopped answering, once its command line shows it is one, and keeps its servers. Anything else on the port is left running, with a line saying what it is. The registry's `/servers` gives its `version`
- **Says why phones can't find the computer**: when the Bonjour announcements can't go out, `preview start` prints the error, and on macOS the Local Network setting to allow. A stopped registry sends goodbyes, so phones drop its servers straight away
