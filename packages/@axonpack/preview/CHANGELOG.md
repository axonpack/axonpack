# @axonpack/preview

## 0.2.0

### Minor Changes

- d16ce9d: - **`PreviewList` without a FlatList**: `virtualized={false}` draws every row in a plain ScrollView, for a place a FlatList can't run, such as a React Native DevTools tab. There is no pull to refresh then
  - **Add a host types in a DevTools tab too**: the field no longer throws there when typed into
  - **Set up through `@axonpack/expo-devtools`**: pass this package's config through `@axonpack/expo-devtools/support/preview/v0`, and the devtools mount the provider, add a Preview tab, and add a `preview` topic to the `devtools` command line tool for switching, downloading, updating and deleting previews from a terminal
- 7727fde: - **Header card**: the list opens with what runs now, where it comes from and whether it is the default. The facts for a bug report sit behind Show details
  - **Back to default**: one button goes back from a preview or a picked dev server, to the default Metro in a debug build and to the bundle built into the app in a release build
  - **Errors in plain words**: a snackbar above the list says what went wrong and what to try, with Retry and Dismiss. On the Android emulator it says how to reach a bucket on localhost
  - **Dev servers in one card**: the server the app runs from says Active, the one it starts on says Default server, and a chip says `server: Expo` or `server: Preview`. Tap a row to switch to it
  - **Preview rows**: `status:` and `env:` chips, the branch, the changelog cut to three lines with Show more, who published it and how long ago, and one main action. A broken preview says what happened
  - **Incompatible downloads in one card**: each shows its title, branch, environment, who published it and when, and its size
  - **Chips scroll sideways** when a row of them does not fit
  - **EAS environment on each preview**: `preview publish --environment` records it, and the list shows it as an `env:` chip
  - **Your own theme**: pass a partial theme, or the palette you give `@axonpack/expo-devtools`. New theme keys: `tint`, `tintBorder`, `dangerSurface`, `info`, `accent2` and `accent3`
  - **Style it like a FlatList**: `PreviewList` takes FlatList props, such as `contentContainerStyle`, `ListHeaderComponent` and `ListFooterComponent`
  - **`usePreviewStatus`**: a new hook that returns everything the header card shows, with `backToDefault()` and `refresh()`, for a banner or badge of your own
  - **`Running.kind` is now `"default"`** where 0.1.0 said `"base"`, in `useRunning` and `runningNow`. `source` says where the default bundle comes from
  - **Deprecated labels**: `title`, `base`, `backToBase`, `stopDevPreviewServer`, `localSuffix` and `status`. They are still accepted. Use `backToDefault` and `statusShort` instead
  - **What runs is what loaded**: a chosen preview that could not start no longer shows as running. `usePreview()` has `runningId`
  - **Switching to a preview while a dev server is picked** now loads the preview
  - **A relative bucket URL** now says which setting to fix
  - **No deep import warning on React Native 0.88**: the dev server scan reads Metro's host without a deep import from `react-native`, so Metro no longer warns about it
  - **No bucket URL means not set up, not an error**: with `s3Config.url` undefined, empty or blank, the app reads nothing from a bucket and Published previews says previews aren't set up. `s3Config.url` is required in the type, so apps pass the env value with `as string`. `usePreview()` and `usePreviewStatus()` have `previewsConfigured`
  - **Bucket settings under `s3Config`**: `url`, `readAccessKeyId`, `readSecretAccessKey`, `region` and `headers` now go in `s3Config: { ... }`. The top-level fields of 0.1.0 still work but are deprecated. When both are set, `s3Config` wins and the app logs one warning
  - **One bucket for several apps**: each app's previews go in a folder named after its Expo slug, so apps that share a bucket no longer list, download or delete each other's. The bucket URL needs no folder; one that ends in a folder still works, with the slug folder inside it. Previews published by 0.1.0 keep showing until that build gets its first preview under the slug, so republish the old ones to move them under the slug. A build made with 0.1.0 doesn't list previews published from this version, so give QA a new build. A build without the config plugin passes `slug` beside `buildKey`
  - **An offline server stays in view**: when the server the app runs from stops, the header card and its row say Offline and what to do, with the title, branch and kind it had when it last answered, after a reload too. `usePreviewStatus()` has `online`
  - **A stopped dev server no longer blocks the start**: in a debug build the app asks the picked server's Metro first, and when it doesn't answer within a second, that start loads the preview or the default instead of stopping at "Could not connect to development server". The server stays picked and its row says Offline. Back to default forgets it, and once it runs again the next start uses it
  - **Servers go by their own names**: a server `preview start` did not name shows its address, never the app's name. One the app never saw answering shows a plain `Server` chip
  - **A quieter server scan**: every 2 seconds the list asks only the registry and the servers it knows, so a `preview start` server still shows within two seconds. The full scan of ports 8081 to 8099 runs on open, on refresh and every 30 seconds, never in the background, with a spinner beside the heading. iOS no longer fills the Xcode console with a refused connection per port. `usePreviewStatus()` has `scanning`
  - **Hosts at the end of the dev servers card**: a Hosts row lists where the list looks, and Add a host takes another computer's address, saved on the device. Another computer shows only its `preview start` servers, through its registry on port 19150, never a plain `expo start`. `devPreviewServers` also takes `{ enabled, allowCustomHosts, hosts }` for the app's own hosts, and a registry that refuses is asked again only on a full scan
  - **`preview start` announces the port Metro really took**, once it answers, so its title and kind no longer show on another server
  - **More in the dev servers state**: `useDevPreviewServersState()` has `alive`, `scanning` and `hosts`. `devPreviewServersStore` has `addHost()` and `removeHost()`, and `previewsStore` has `clearError()`
  - **New exports**: `runningLabel`, `runningKind`, `sameServer` and `fromDevtoolsPalette`, and the types `PreviewS3Config`, `DevPreviewServersOptions`, `DefaultSource`, `BundleKind`, `PreviewStatusInfo`, `PreviewListThemeInput`, `DevtoolsPaletteLike`, `DevServerHost` and `HostAddress`
  - **New labels** for every new piece of text, and a few defaults reworded. The reference lists them all
- 7c7dff2: - **Servers found on the network**: while the dev servers list is open, the app asks every address on its own /24 for a `preview start` registry, on open, on refresh and on return to the foreground. A teammate's `preview start` on the same Wi-Fi shows with no address typed in, and a plain `expo start` there never does
  - **`preview start` prints the address to type**: after its port, one line per private IPv4 address of the computer, such as `On a phone on this Wi-Fi: Add a host → 192.168.1.38`, for a phone the sweep doesn't reach
  - **One row per server**: a computer reached two ways, such as `localhost` and its LAN address, or a host you added that the sweep finds too, shows once. The registry's `/servers` also gives the computer's id and LAN addresses
  - **iOS asks first**: a real iPhone asks once for Local Network access, the first time the list looks beyond the phone. To word the prompt yourself, add `NSLocalNetworkUsageDescription` to `ios.infoPlist`
  - **Dev servers need `enabled` too**: with `enabled` false the list shows no dev servers, even with `devPreviewServers` on, as the docs always said
  - **An older registry is replaced**: `preview start` replaces a registry from an older version on port 19150, or one that stopped answering, once its command line shows it is one, and keeps its servers. Anything else on the port is left running, with a line saying what it is. The registry's `/servers` gives its `version`

### Patch Changes

- 83cb09a: - **Agent skill from axonpack/skills**: the README's install line now uses `npx skills add axonpack/skills`

## 0.1.0

### Minor Changes

- 8005dc8: - **New package**: publish a JS bundle per branch or pull request, and switch to it in the installed app with no native rebuild
  - **Preview list**: `PreviewProvider` and a ready-made list to download, switch, update and delete previews. `usePreview` and `useRunning` let you build your own screen
  - **Crash fallback**: if a preview crashes before it starts, the next launch goes back to the built-in bundle
  - **Only previews that fit**: matched by app version or native fingerprint with the config plugin's `compatibility` option. Downloads for another build show under Incompatible, with Delete all
  - **`preview` CLI**: `publish`, `unpublish` and `prune` work with any S3-compatible bucket, public or private with a read-only key. `--environment` builds with an EAS environment's variables
  - **Local Metro servers**: `preview start` runs Metro on a free port, and debug builds can switch between local servers from the list
  - **expo-updates**: works alongside it
