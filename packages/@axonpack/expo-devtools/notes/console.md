# Console

Every `console` call the app makes, on the device, with the objects still explorable — plus a prompt
that evaluates expressions against the running app.

## Features

- [x] Captures log, info, warn, error and debug
- [x] Captures the console inside a WebView
- [x] Each argument gets its own cell; objects render as an inspectable tree
- [x] Errors show the message with the stack behind a disclosure
- [x] Every crash appears as a row of its own level, and opens its full report
- [x] Repeated messages collapse into one row with a count
- [x] Reads oldest-first like a terminal, with a jump-to-bottom button
- [x] Filter by level with counts, search, and filter by source
- [x] A prompt for running expressions and statements on the device
- [x] Inject your own values into the prompt's scope
- [x] Browse and pull exports out of loaded modules from the prompt
- [x] Tap a past command to load it back into the prompt
- [ ] Command history cycling and a live result preview while typing
- [ ] `%s` / `%d` / `%o` format specifiers
- [ ] Call site — which file logged this
- [ ] Console entries included in Export

## How it captures

`console.log`/`info`/`warn`/`error`/`debug` are wrapped and forwarded to whatever was already there,
so React Native's own LogBox — which patches `console.error` and `warn` itself — keeps working. A
page in a WebView is captured the same way the network tab captures its requests: a script patches
`console` inside the page and relays over `postMessage`, reusing the same declared-name allowlist.

Arguments are serialised **inside the page** for WebView rows, because `postMessage` is JSON and a
function, an `undefined` and an `Error` would all arrive as nothing useful.

## Decisions worth knowing

- **A crash is its own level, and the crash capture writes the row.** React Native re-emits an error
  it is reporting through `console.error`, which used to be where the row came from — but a fatal
  error never reaches that re-emit any more, since the handler doing the reporting is the one being
  withheld from, and a native exception never passed through JavaScript at all. So the row is written
  where the crash is recorded, which also means every kind arrives the same way and reads the same:
  one icon, one filter chip, and the message opening the report rather than only the inline stack.
  Where React Native does still re-emit, that echo is dropped — the same `Error` object is the proof
  it is an echo, and one crash should be one row.
- **Nothing is forced past the record button.** A paused console is one somebody asked to stop
  writing to, and the crash is in the Crash tab either way.

- **One cell per argument, one per line.** Chrome flows them inline and this did too for a while,
  but a phone's width rarely holds a string and an object side by side, so the inline version spent
  most of its time wrapping anyway.
- **Objects are snapshotted at capture time**, deep-copied into the tree's own shape (circular-safe,
  depth-capped, a throwing getter becomes `[Threw]`). Holding references would pin hundreds of live
  app objects in the ring buffer, and an expanded row would show the object's state _now_ rather
  than when it was logged.
- **Repeated messages collapse into a count**, so one log inside a render doesn't evict the buffer.
  REPL rows are exempt: a command you just typed always appears, even while recording is paused.
- **Oldest at top**, the opposite of the Network tab. A prompt docked at the bottom only makes sense
  against one ordering, and offering both would leave the input detached from the newest output half
  the time. It comes from an inverted list, so following the tail needs no scroll effect — new rows
  land at offset 0, where you already are. In an inverted list the newest end _is_ offset 0, which
  is the one thing to remember when touching that scroll logic.
- **The prompt compiles what you type**, so it defaults to development only. Evaluation is
  `new Function`, expression form first and statement form second — not `eval`, which Hermes
  deliberately excludes in its local-mode form.
- **Scope is globals plus injected names.** Metro compiles every module into a closure no scope can
  reach into, so browsing modules needs Metro's own registry, and your own values have to be handed
  in through the config. Those registry helpers are undocumented internals and development-only; the
  injected names are the half that works in a release build.
- **A plain log gets no glyph** — an empty spacer keeps its text on the same left edge as every
  other row, which is what makes a mixed list readable.

## Won't do

- **`undefined`, functions and symbols nested inside a logged object.** The tree's value shape has
  no slot for them, so they snapshot to strings. Only nested values are affected; as a top-level
  argument each still renders properly in its own cell.
