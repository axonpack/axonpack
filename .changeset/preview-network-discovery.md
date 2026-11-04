---
"@axonpack/preview": minor
---

- **Servers found on the network**: while the dev servers list is open, the app asks every address on its own /24 for a `preview start` registry, on open, on refresh and on return to the foreground. A teammate's `preview start` on the same Wi-Fi shows with no address typed in, and a plain `expo start` there never does
- **`preview start` prints the address to type**: after its port, one line per private IPv4 address of the computer, such as `On a phone on this Wi-Fi: Add a host → 192.168.1.38`, for a phone the sweep doesn't reach
- **One row per server**: a computer reached two ways, such as `localhost` and its LAN address, or a host you added that the sweep finds too, shows once. The registry's `/servers` also gives the computer's id and LAN addresses
- **iOS asks first**: a real iPhone asks once for Local Network access, the first time the list looks beyond the phone. To word the prompt yourself, add `NSLocalNetworkUsageDescription` to `ios.infoPlist`
- **Dev servers need `enabled` too**: with `enabled` false the list shows no dev servers, even with `devPreviewServers` on, as the docs always said
- **An older registry is replaced**: `preview start` replaces a registry from an older version on port 19150, or one that stopped answering, once its command line shows it is one, and keeps its servers. Anything else on the port is left running, with a line saying what it is. The registry's `/servers` gives its `version`
