# Debug tab

Promoted the Limiter out of the Performance tab into a new top-level Debug tab.

## What moved

- `components/performance/limiter-panel.component.tsx` → `components/debug/limiter-section.component.tsx`
  (`LimiterPanel` → `LimiterSection`, matching `ResourcesSection` / `StartupTimingSection` naming).
- `services/performance/limiter.service.ts` → `services/debug/limiter.service.ts`, with its test.
- New `components/debug/debug-view.component.tsx` — a composing shell, ready for further sections.
- `PerformanceSection` lost its `'limiter'` member, which also simplified `PerformanceListKey`'s
  `Exclude`.
- `DevtoolsTab` gained `'debug'`, last in the bar after Crashes.

## Decisions worth remembering

- **Why it moved at all.** Every other Performance section _reports_ something that happened; the
  Limiter goes out and _causes_ it. It was a category error sitting among the measurement chips.
- **No toolbar on the Debug tab.** There is no stream to record and nothing to clear, so an empty
  toolbar row would be pure chrome. Storage sets the precedent for tabs that drop the record button;
  this one drops the row entirely.
- **The Limiter section keeps its bottom border**, so a second section drops in below it with a
  divider already in place.
- **Two notes were rewritten, not just relocated.** One told you to "watch the JS numbers" while the
  main thread froze — impossible now that they are separate tabs. The crash buttons also gained a note
  each, because the JS and main-thread crashes now behave visibly differently: one is reported before
  you release the button, the other after the next launch.

## Follow-up fixes

- **The crash message still said "Crash from the devtools Limiter"** — a locator that stopped being
  true the moment the Limiter stopped being a tab. Now `Deliberate crash from @axonpack/expo-devtools
(JS thread | main thread)`: it names the package, not the tab, because the string becomes the crash
  record's message and outlives whatever UI it was pressed from. A comment on the constant says so.
- **"Limiter" is gone from the UI entirely.** A `CollapsibleSection title="Limiter"` was tried first,
  since removing the section chip left the controls with no heading at all — but the tab bar already
  says Debug, so the heading was redundant naming for a tab with one section. Docs follow: REFERENCE's
  `### Limiter` is now `### Block and crash a thread`, and README describes "these controls" rather
  than a named feature. Internal names (`limiter.service.ts`, `LimiterSection`) are unchanged.

## Docs

README (Features gained a Debug section, screenshot moved out of the Performance row, Expo Go and
production-guard notes reworded), REFERENCE (new Debug tab section placed after Storage to match the
tab bar, header/toolbar tables updated for Crashes and Debug, dev-build table row relabelled).

## Verification

`oxlint` and `tsc --noEmit` clean; 27 suites / 243 tests passing. Not exercised on a device.

## Known gaps

- Neither README.md nor REFERENCE.md documents the Crashes tab yet — it was added in
  `2026-08-19-0001` and only ROADMAP.md covers it.
- `docs/screenshots/perf-limiter.png` is stale: it shows the controls under the Performance tab's
  toolbar and section chips, neither of which the Debug tab has. Needs retaking.
