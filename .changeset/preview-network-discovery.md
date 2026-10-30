---
"@axonpack/preview": minor
---

- **Servers found on the network**: a teammate's `preview start` on the same Wi-Fi shows in the dev servers list with no address typed in. `preview start` announces it over Bonjour, and a plain `expo start` is never announced
- **Each row says which computer**: a server found on the network shows its computer's name and port, so two computers on port 8081 are two rows. `DevPreviewServer` has `machine`
- **One row per server**: a server found on `localhost` and over Bonjour, or through a host you added, shows once. The registry's `/servers` also gives the computer's id and LAN addresses
- **iOS asks first**: add `NSLocalNetworkUsageDescription`, and `NSBonjourServices` with `_axon-preview._tcp`, to the app's `ios.infoPlist`. iOS then asks the user once
