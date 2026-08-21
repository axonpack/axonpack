# Production tier policy, and two options removed

## Removed

- **`crash.keepAliveOnJsCrash`** — built earlier in the day, removed unshipped. It swallowed a fatal
  JS error so the app carried on. Dropped as out of scope: a fatal JS error is not something this
  package should be deciding to survive. The `persist` override it needed on `captureCrash` went with
  it.
- **`crash.showPopup`** — a captured crash now always opens a sheet, so the option only existed to
  create the state where a crash is recorded and shown nowhere. `crash-popup.service.ts` kept only
  the `full` / `compact` detail; the two `__DEV__` warnings that guarded the bad combinations are
  gone with the combinations.

## Changed

**Once the devtools are disabled, only `native-exception` is captured.** Previously all four tiers
were, which put a sheet in front of a user for errors the app had already recovered from.

Two mechanisms, deliberately both:

- `installCrashHandlers` does not install the JS handlers at all when `enabled` is false — no wasted
  work, and RN's own handling is untouched.
- `captureCrash` also drops non-native kinds, because `DevtoolsErrorBoundary` is a component the app
  mounts and calls `captureCrash` directly; a handler-level gate can never see it.

**A fatal JS error is still reported in production**, and this is the part worth remembering: React
Native turns one into a native exception on the way to killing the process — `RCTFatal` on iOS,
`JavascriptException` on Android — so the native handler picks it up and it lands as
`native-exception`. Nothing was lost by dropping the JS tiers there; only errors the app survived stop
being reported.

## Verification

30 suites / 273 tests passing. Eight new: four asserting each tier's fate with the devtools off, four
asserting all four survive with them on. `oxlint` / `tsc` clean, example typechecks.
