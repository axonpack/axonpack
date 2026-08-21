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

- **A factory, not a Provider.** The client installs instrumentation; it renders nothing, and the UI
  is mounted separately. Nothing about capturing a request needs to be inside the React tree.
- **`init()` is the whole gate.** There is no config flag that says the same thing: not calling it
  _is_ how the devtools are off. That is what makes shipping this code to production free — guard
  the one call and the entire package is inert. Crash reporting is the single, deliberate exception.
- **Two gates, easily confused.** Each store's internal `enabled` flag is what `init()` flips, and
  nothing in the UI can turn it back on. `paused` is what the record button controls. A config
  option asking for "off by default" maps to `paused`, never to `enabled` — mapping it to `enabled`
  would leave a tab permanently dead.
- **The launcher button is self-guarding.** It subscribes to a store that `init()` flips at its very
  end, and draws nothing until then, so an app that mounts it without a development check ships no
  button rather than one that opens empty lists. A store rather than a boolean because the order
  isn't guaranteed: `init()` normally runs at module scope, but an app calling it from an effect
  mounts the overlay first.
- **Themes are registered by the factory, not by `init()`.** Registering a palette patches nothing
  and starts nothing, and the crash notice is a piece of UI that can render in a release build where
  `init()` never ran — it has to be able to find the palette.
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
