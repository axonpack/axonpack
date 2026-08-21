# Crash capture without init()

`enableWhileDevtoolsDisabled: true` now installs the crash handlers when the client is constructed,
instead of waiting for `init()`.

## The bug

Reported from the example app: the flag was set, `init()` was not called, and no crash was ever
reported. That was the implemented behaviour and it was wrong — the flag says crash capture survives
the devtools being off, and `if (__DEV__) devtools.init()` in a release build switches them off just
as surely as `enabled: false` does. Waiting for a call that never comes made the flag a promise the
package didn't keep.

## What changed

- `createDevtoolsClient` calls `initCrashCapture(false)` at factory scope when the flag is set.
- `initCrashCapture` took a `panelAvailable` parameter. It is **not** the same as `devtoolsEnabled`:
  the factory-time call cannot know whether `init()` is coming, so `popupDetail: 'auto'` resolves to
  `compact` there, and the `init()` call upgrades it to `full` if a panel really is going up.
- Theme registration moved from `init()` to factory scope, for the same reason — the crash sheet
  honours `defaultTheme` in a build where `init()` never runs. Registering a palette patches nothing
  and starts nothing; it fills a lookup only a render reads.
- Six new tests, and one existing test rewritten: it asserted `crashStore.isEnabled() === false` with
  no `init()`, which was the old contract.

## Decisions worth remembering

- **This is the one deliberate exception to "nothing runs until `init()`".** Worth stating plainly
  because CLAUDE.md documents that rule as load-bearing. The justification is that setting the flag
  _is_ the consent `init()` would otherwise have given — it is explicit, opt-in, and names exactly
  this behaviour. The side effects are still confined to error handlers; no fetch/XHR/console
  patching, no stores beyond the crash one.
- **Both call sites are safe to hit.** `installCrashHandlers` guards on an `installed` flag, and
  everything else in `initCrashCapture` is idempotent, so factory-then-`init()` re-runs harmlessly.
- **Earlier coverage is a real gain, not just a fix.** Handlers installed at import catch throws that
  happen before `init()` would have run.

## Verification

29 suites / 260 tests passing. `oxlint` and `tsc --noEmit` clean. Not re-checked on a device — the
original report came from the example app, so that is the thing to re-run.
