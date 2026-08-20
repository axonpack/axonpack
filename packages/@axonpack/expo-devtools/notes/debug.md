# Debug

Deliberate misbehaviour, on demand: block a thread, or crash one. The only part of this package that
exists to _cause_ problems rather than observe them.

## Features

- [x] Block the JS thread for a chosen duration
- [x] Block the main thread for a chosen duration
- [x] Crash the JS thread on purpose
- [x] Crash the main thread on purpose

## What it does and why it needs native code

Blocking the JS thread is a busy loop in JavaScript. Blocking the **main** thread is not reachable
from JavaScript at all, so it goes through this package's one native module — which is also the
whole reason that module exists, alongside reading the real process start time.

The pairing is the point. Blocking JS shows up as a long task and drops the JS frame rate, both
visible on the Performance tab. Blocking the main thread freezes the screen while JavaScript keeps
ticking, and the Performance tab's JS numbers stay fine throughout — which is exactly the blind spot
the frame-rate card warns about, made reproducible.

The same applies to the two crashes: a JS throw is caught and reported before you let go of the
button, while a main-thread crash ends the process and is read back off disk at the next launch.

## Decisions worth knowing

- **Crash is a two-tap button.** It is armed by the first tap and fires on the second, because there
  is no undo for the main-thread one.
- **Busy-wait rather than sleep.** Sleeping suspends the thread and lets the OS schedule other work,
  which is not what a blocked thread looks like. Spinning is the accurate simulation.
- **The crash paths are not gated on development builds.** Reaching them needs the panel, which
  needs `init()`, so the `init()` call is the single gate for everything here — the same rule the
  rest of the package follows.
- **The message names the package, not the tab.** It becomes the crash record's message and outlives
  the UI around it; whoever reads it in a bug report cares that the devtools caused it, not where
  the button happened to live that release.
- **Unavailable controls are disabled and say why**, rather than being hidden: without a development
  build the main-thread half cannot work, and a button that silently does nothing is worse than one
  that explains itself.

## Won't do

- **Reaching the main thread without a development build.** Both main-thread controls come from this
  package's native module, so they go quiet in Expo Go. The JS half works anywhere.
