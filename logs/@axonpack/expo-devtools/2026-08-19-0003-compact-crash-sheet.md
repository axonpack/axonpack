# Compact crash sheet

The crash report sheet now has two forms; a release build gets the plain one.

## What was built

- `components/crash/compact-crash-sheet.component.tsx` — error name, message (clamped to four lines),
  timestamp and app version, then Share / Copy / Dismiss.
- `services/crash/crash-popup.service.ts` gained `setCrashPopupDetail` / `getCrashPopupDetail`.
- `crash-report-overlay.component.tsx` picks between the two.
- Client config: `crash.popupDetail?: 'auto' | 'full' | 'compact'`, default `'auto'`.

## Decisions worth remembering

- **`'auto'` resolves off `enabled`, not `__DEV__`.** The question is whether the panel ships, not
  which build type it is — an internal release build with the devtools on should still get the full
  sheet.
- **Not built on `BottomSheet`.** Every other sheet in the package uses it, but its header leads with
  the Axonpack logo, which is right for a devtools panel and wrong in front of a user. The compact
  sheet carries its own slide-in animation instead.
- **No stack, no tabs, no raw JSON — but nothing is lost.** Share and Copy both serialise the whole
  record through `formatCrashReport`, so the detail is one tap away rather than on screen by default.
- **Theme registration moved above the `enabled` gate.** Found while writing this: `themes` and
  `defaultTheme` were applied inside the `devtoolsEnabled` block, so a release build rendering the
  compact sheet would have got the default light palette regardless of config. The sheet is the one
  piece of UI here that can render in a release build.

## Verification

29 suites / 250 tests passing, including four covering `'auto'` resolution in both directions and both
explicit overrides. `oxlint` and `tsc --noEmit` clean. Not exercised on a device — the sheet's layout
and animation are unverified visually.
