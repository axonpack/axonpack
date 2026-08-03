# Conventions

- **Comments — why, not what.** Do not add comments that restate what the code plainly does or repeat the function name. Keep comments only for non-obvious rationale, constraints, gotchas, or ordering requirements (e.g. "must run before render", "iOS issues no token on Simulator"). Prefer a self-explanatory name over a comment. `TODO(scope):` markers for deferred work are fine.
- **One component per file — screens are thin compositions.** Every reusable/composed component gets **its own file** in the feature's `components/` folder (`*.component.tsx`) or, if shared, `features/core/components/`. **Never define helper components (cards, tiles, icon wrappers, list rows, etc.) inline inside a `*.screen.tsx` file** — a screen only composes imported components and lays out the page. This mirrors the existing pattern (`features/auth/components/otp-input.component.tsx`, `features/pos/components/payment-method-tile.component.tsx`). Prefer passing data/assets as props (e.g. an `iconSource` `require(...)`) over creating a trivial one-off component per variant. A `*.screen.tsx` should contain exactly one exported `*Screen` component and no other component definitions.
- **File naming:** kebab-case with role suffixes — `*.ui.tsx` (atomic primitive), `*.component.tsx` (composed domain UI), `*.screen.tsx`, `*.query.ts` (TanStack query hook), `*.mutation.ts` (mutation-only hook), `*.hook.ts` (non-data React hook), `*.store.ts` (Zustand), `*.service.ts` (non-hook service logic), `*.util.ts` (pure helper), `*.schema.ts` (Zod), `*.const.ts`, `*.config.ts`, `*.types.ts`, `*.enums.ts`, `*.entities.ts`, `*.provider.tsx`, `*.client.ts`, `*.api.ts`. Match the existing suffix when adding files.
- **Role-based folders (the standard).** A file lives in the folder named for its role, with the matching suffix:

  | Role                                                | Folder       | Suffix          |
  | --------------------------------------------------- | ------------ | --------------- |
  | TanStack query hook (`useQuery`/`useInfiniteQuery`) | `queries/`   | `*.query.ts`    |
  | Mutation-only hook (`useMutation`)                  | `queries/`   | `*.mutation.ts` |
  | Non-data React hook                                 | `hooks/`     | `*.hook.ts`     |
  | Non-hook service logic                              | `services/`  | `*.service.ts`  |
  | Zustand store                                       | `stores/`    | `*.store.ts`    |
  | Pure helper                                         | `utils/`     | `*.util.ts`     |
  | Zod schema                                          | `schemas/`   | `*.schema.ts`   |
  | Constant                                            | `constants/` | `*.const.ts`    |

  Rules: keep the `use-` prefix on query/hook filenames (`queries/use-chambers.query.ts`); a file holding **both** a query and a mutation stays whole as `*.query.ts` (reserve `*.mutation.ts` for mutation-only); platform variants put the role suffix first, platform last (`use-color-scheme.hook.web.ts`); create a role folder only when it has a file (no empty `schemas/`).
