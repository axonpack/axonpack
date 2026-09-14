# Core

The parts that are not a tab: the client you create, the gate that keeps it out of production, the
button that opens the panel, and the palette everything is drawn in.

## Features

- [x] One factory call to set up, one call to start
- [x] Nothing is captured or patched until the devtools are started, so it is safe to ship
- [x] Draggable floating button that opens the panel
- [x] The button hides itself when the devtools were never started
- [x] Tabs keep their filters and scroll position while the panel is open
- [x] Error and unread counts on the tab bar
- [x] Seven built-in themes, plus your own palette on top of one
- [x] Selectable text and one-tap copy throughout
- [ ] Remember the chosen theme between launches

## Decisions worth knowing

- **One provider, and no client object.** The provider is a mount, not a context: it calls
  `startDevtools(config)` during render and lays the panel out beside the app. Nothing about
  capturing a request needs to be inside the React tree, which is why the rest of the API is two
  hooks and a module-level `devtools` object rather than something the provider hands down.
- **During render, not in an effect.** A parent's effects run after its children's, so an effect
  would install the patches after the app's first mount and miss what that mount requested.
  `startDevtools` is idempotent, so calling it on every render costs a comparison.
- **`config.enabled` is the whole gate.** That is what makes shipping this code to production free:
  one flag and the entire package is inert, mount included. Crash reporting is the single,
  deliberate exception. The config is read once, on the first render, because the patches are global
  and go in one time, so `enabled` cannot be flipped mid-session.
- **Two gates, easily confused.** Each store's internal `enabled` flag is what the start flips, and
  nothing in the UI can turn it back on. `paused` is what the record button controls. A config
  option asking for "off by default" maps to `paused`, never to `enabled`, because mapping it to
  `enabled` would leave a tab permanently dead.
- **The panel is a store, not provider state.** `panel-visibility.store.ts` holds whether it is open,
  because the launcher button is optional: an app that hides it opens the panel through
  `useDevtoolsPanel`, from a call site nowhere near the component holding the modal.
- **The launcher button is self-guarding.** It subscribes to a store the start flips at its very end,
  and draws nothing until then, so nothing is drawn in a build that never started. A store rather
  than a boolean because a provider mounted later in a session is not in step with a render that
  already happened.
- **Themes are registered before the `enabled` check.** Registering a palette patches nothing and
  starts nothing, and the crash notice is a piece of UI that can render in a release build with the
  devtools off, so it has to be able to find the palette.
- **Every stylesheet is built through a theme factory.** `StyleSheet.create` copies the colour
  values it is handed, so a sheet built at module load can never follow a theme. Naming the
  factory's parameter `COLORS` is what made the migration mechanical: hundreds of in-style usages
  needed no edit.
- **Colour-returning helpers take a palette argument** rather than closing over one, and there is an
  `isErrorStatus` predicate because one call site compared a colour to the error colour — which
  stops meaning anything the moment there are two palettes.
- **The active theme is in memory for the session.** Persisting it would mean a storage dependency,
  which is the one thing this package refuses to take on.

## Won't do

- **Full coverage in Expo Go.** Native exception capture, device and memory details, disk space and
  the main-thread controls all come from this package's one native module, which is not in Expo Go.
  Everything else behaves identically; a development build gets the full set.
