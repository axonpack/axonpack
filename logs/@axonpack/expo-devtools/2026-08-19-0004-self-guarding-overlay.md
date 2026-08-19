# Self-guarding overlay

`<DevtoolsOverlay />` now renders nothing unless `init()` brought the panel up.

## What was built

- `stores/devtools-ready.store.ts` — a one-way flag with the usual `EventEmitter` + subscribe shape.
- `create-devtools-client.client.ts` — `devtoolsReadyStore.markReady()` as the last statement of
  `init()`.
- `devtools-overlay.component.tsx` — subscribes, and early-returns before drawing the button or the
  panel modal.
- `client/__tests__/init-gates.test.ts` — readiness in four configurations plus the `popupDetail`
  resolution cases, which moved here from `services/crash/__tests__/popup-detail-resolution.test.ts`
  (they were always client-gate tests).

## Decisions worth remembering

- **A store, not a boolean.** Order is not guaranteed. `init()` normally runs at module scope before
  anything renders, but an app calling it from an effect — or from Expo Router's root layout — mounts
  the overlay first, and it has to re-render when the flag lands.
- **Marked at the _end_ of `init()`, not after the `enabled` gate.** It then means "there is a working
  panel behind this button". Anything above throwing leaves the overlay hidden, which is honest.
- **`enabled: false` leaves it false.** The crash-capture-only configuration returns before the mark,
  so no button appears — which is the whole point.
- **The crash overlay is outside the gate.** `if (!ready) return <CrashReportOverlay />` rather than
  `return null`: crash reporting is the one subsystem meant to run in production, and an app that
  mounts `DevtoolsOverlay` unguarded should still get its reports. Getting this wrong would have
  silently disabled production crash reporting for exactly the apps the feature was built for.

## Docs

This inverts advice the docs gave emphatically in three places — README's "Both guards matter",
README's production WARNING, and REFERENCE's "Shipping safely takes two guards, not one". All three
now say `init()` is the guard and mounting the overlay unguarded is harmless, with guarding it still
recommended as belt and braces. The Debug tab warning changed meaning too: its buttons bypass every
store and are not `__DEV__`-gated, but they live behind the panel, which is now unreachable without
`init()`.

## Verification

29 suites / 255 tests passing. `oxlint` and `tsc --noEmit` clean. Not exercised on a device — in
particular the "mounted before `init()`, appears after" path has only been tested through the store,
not through a real render.
