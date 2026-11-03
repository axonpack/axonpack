# Agent relay

A tool on the computer running Metro calls the app's `globalThis.__AXONPACK_AGENT__` through the
DevTools window open on it, on that window's own debugger connection. Added for
`@axonpack/expo-devtools`'s `devtools` CLI, which needs a way in on a React Native that allows one
debugger per app, where attaching its own would close the window. The README's "Calling the app
from a terminal" is the contract.

## Status

- [x] `GET /axonpack-rn-devtools-tab/agent` lists the pages a window is open on.
- [x] `POST` there with `{ page, call, arg }` runs the call in the window open on that page and
      answers `{ value }` or `{ error }`.
- [x] The host script holds `GET .../agent/window?page=` open as an event stream while the window
      lives, and posts each result to `.../agent/reply?id=`. It starts with the script, not after
      the tab dispatcher connects, since a call needs only the connection.
- [x] Loopback address only, with an Origin and Host that are loopback when present. Calls capped
      at 64 KB, replies at 64 MB. `call` is a word, `arg` a JSON object, and only the object's own
      methods are called.
- [x] Unit tests: the refusals, and a round trip through the real middleware with the real host
      script relay and a fake DevTools connection (`src/metro/__tests__/agent-relay.test.ts`).
- [ ] Checked live on a React Native below 0.86 with a window open, and the window still connected
      after a call.

## Known limits

- The page is named by the query of its debugger URL (`device=...&page=...`). A window opened on a
  page that is later replaced (a cold restart that gives the app a new page id) keeps the old name
  until it reloads.
- A window opened another way (not from Metro's shortcut, which this package points at its own
  route) has no host script, so it never registers, and a tool that sees no window may attach and
  close it.
- The newest window on a page wins. React Native has already disconnected an older one on such a
  version, so that one would only answer with an error.
- A call to a window whose app is paused at a breakpoint waits. The relay has no timeout of its
  own; the caller's (the CLI's 5 s) ends it, and the late reply is dropped.
