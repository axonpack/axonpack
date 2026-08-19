# Compact crash sheet actions

The production crash sheet lost its close cross and its Copy button; it now offers Share report and
Restart app.

## What changed

- `compact-crash-sheet.component.tsx` — no cross in the header, no Copy, no Dismiss. Two buttons.
- `services/crash/restart-app.service.ts` — `canRestartApp()` / `restartApp()`.
- Android module: `restartApp()` — launcher intent on a fresh task, then `Runtime.exit(0)`.
- iOS module: a comment where the function would go, explaining why it is absent.

## Decisions worth remembering

- **iOS cannot restart or exit an app.** `exit(0)` and `abort()` both work technically and both are
  documented App Store rejections; Apple's position is that quitting is the user's decision. So the
  button is capability-checked rather than platform-checked (`typeof native.restartApp === 'function'`,
  which is false on iOS because the Swift module simply does not define it) and falls back to
  **Close**. Shipping a Restart button that silently does nothing on every iPhone would have been the
  easy wrong answer.
- **Android kills the process rather than reloading JS.** A soft reload would leave behind whatever
  native state the crash happened in, which is the thing you are restarting to escape.
- **Copy went with the cross.** The instruction was "just share report and restart"; the full record
  still leaves through Share, which serialises everything Copy would have.
- **The backdrop and the Android back button still dismiss.** With no cross and Restart unavailable on
  iOS, Close is the only exit — and a sheet with no exit at all is a trap.
- **The restart test uses `doMock` + `resetModules`.** `jest.mock` is hoisted above the value its
  factory needs to capture, and the service reads its native module once at import.

## Verification

30 suites / 266 tests passing, six of them covering the capability check and the failure paths.
`oxlint` and `tsc --noEmit` clean.

## Not verified

Neither native path has been run. The Android restart in particular — intent flags, and whether
`exit(0)` races the `startActivity` — is exactly the kind of thing that needs a device.
