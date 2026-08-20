# Conventions

- **Comments — why, not what.** Do not add comments that restate what the code plainly does or repeat the function name. Keep comments only for non-obvious rationale, constraints, gotchas, or ordering requirements (e.g. "must run before render", "iOS issues no token on Simulator"). Prefer a self-explanatory name over a comment. `TODO(scope):` markers for deferred work are fine.
- **One component per file; composite views only compose.** A view like `network-view.component.tsx` imports and lays out `LogRow`, `OverviewStrip`, `DetailPanel` rather than defining them inline. Don't define helper components inside another component's file. When a component accrues multiple internal pieces (e.g. per-tab sections), promote it from a single file to its own folder — see `features/network/components/detail-panel/` (`index.tsx` entry point, one file per tab/section, `shared.styles.ts` for styles common across them).
- **File naming:** kebab-case with a role suffix — `*.ui.tsx` (atomic component primitive: `chip.ui.tsx`, `icon-button.ui.tsx`), `*.component.tsx` (composed domain UI: `log-row.component.tsx`), `*.const.ts` (constant/design token), `*.service.ts` (non-hook, non-React logic — e.g. installing a patch, running a side effect), `*.store.ts` (subscribe/notify state container), `*.util.ts` (pure helper), `*.client.ts` (a package's public factory/entry point). Match the existing suffix when adding files; introduce a new suffix only when none of the above fits.
- **Feature folders, with a layer subfolder underneath.** The path shape is
  `features/<feature>/<layer>/file.<layer-suffix>.ts(x)` — e.g.
  `features/network/components/log-row.component.tsx`,
  `features/network/utils/export-network-log.util.ts`,
  `features/network/services/patch-fetch.service.ts`,
  `features/network/stores/network-log.store.ts`. A feature's whole surface is one folder, so adding a
  tab is one folder and removing one deletes one folder. No existing feature's files move when another
  is added.

  | Layer         | Suffix            | Example                                                   |
  | ------------- | ----------------- | --------------------------------------------------------- |
  | `components/` | `*.component.tsx` | `features/network/components/log-row.component.tsx`       |
  | `constants/`  | `*.const.ts`      | `features/network/constants/resource-type-icons.const.ts` |
  | `services/`   | `*.service.ts`    | `features/network/services/patch-fetch.service.ts`        |
  | `stores/`     | `*.store.ts`      | `features/network/stores/network-log.store.ts`            |
  | `utils/`      | `*.util.ts`       | `features/network/utils/formatters.util.ts`               |

  **`core/` is for what more than one feature uses**, in the same layer subfolders:
  `core/components/ui/chip.ui.tsx`, `core/components/json-tree/`,
  `core/utils/themed-styles.util.ts`, `core/constants/theme.const.ts`,
  `core/stores/theme.store.ts`. The panel shell — the overlay, the panel, the tab bar, the theme
  picker, the toolbar — belongs here too: it hosts every feature and is owned by none.

  **`core/components/ui/` is a standing exception, not a promotion.** Every `*.ui.tsx` atomic
  primitive (`chip.ui.tsx`, `icon-button.ui.tsx`, `info-badge.ui.tsx`, `setting-row.ui.tsx`,
  `collapsible-section.ui.tsx`) goes there from the moment it's created — never inside a feature —
  because an atom composes no other named component and is reusable by construction, unlike a
  `*.component.tsx` (which does stay feature-scoped, e.g.
  `features/network/components/log-row.component.tsx` composes `InfoBadge`). It doesn't need a second
  feature to prove reuse first, which is what makes it different from the rule below.

  **Everything else earns `core/` by being needed twice.** Don't promote a file preemptively: it stays
  inside its feature until a second feature actually imports it. `client/create-devtools-client.client.ts`
  is outside both — one factory for the whole package, and the only thing at the root beside `index.ts`.
