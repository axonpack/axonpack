# Writing the notes

How the markdown under `notes/@axonpack/` is organised and written. Read this before adding a file.

## Every note lives with its package

A note about a package is a file **in that package**, under its own `notes/` folder.
`notes/@axonpack/<pkg>/` holds nothing but symlinks to them, so the whole tree can be read in one
place without a second copy of anything existing.

| The real file                            | The symlink                         | Holds                                                      |
| ---------------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| `packages/<pkg>/notes/README.md`         | `@axonpack/<pkg>/features.md`       | Everything it does, doesn't do yet, or never will          |
| `packages/<pkg>/notes/<feature>-plan.md` | `@axonpack/<pkg>/<feature>-plan.md` | How one **unbuilt** feature will be built                  |
| `packages/<pkg>/notes/<topic>.md`        | `@axonpack/<pkg>/<topic>.md`        | Research: how a platform or another library actually works |

The feature list is that folder's `README.md` so it renders on sight when anyone opens
`packages/<pkg>/notes/`, and it is the only note published to npm — hence its entry in the package's
`files`. A package's `docs/` folder, where it has one, is for the images the README links to.

Adding a note is therefore two steps: write the real file in the package, then

```sh
ln -s ../../../packages/@axonpack/<pkg>/notes/<name>.md notes/@axonpack/<pkg>/<name>.md
```

Three kinds of document live outside all of this, and work belonging to them does not come back in:

- **`packages/<pkg>/README.md`** — how to install and use it. **`REFERENCE.md`** — every option and
  control, in detail. **`CHANGELOG.md`** — generated from changesets.
- **`logs/@axonpack/<pkg>/`** — what was done and what was decided, dated and append-only.
- **`CLAUDE.md`, `CONVENTIONS.md`, `INPUT_STYLES.md`** — how to work in this repo.

## One rule above the rest

**Feature status lives in `packages/<pkg>/notes/README.md` and nowhere else.** No other note gets a
list of what is built. A plan says what it intends to build; a log says what happened; the package
README says how to use what exists. If you find yourself ticking something off in two files, one of
them is wrong.

## The three kinds

**The feature list** — the checklist. It carries its own editing rules at the top; follow those.

**A plan** — written before the work, and it does not outlive it. Name it `<feature>-plan.md`. It may
use checkboxes freely while the work is open, because it is describing a sequence. **The day the
feature ships, the plan moves to `logs/`** — its checkboxes stop being true the moment the feature
list says the feature is built, and two lists disagreeing is worse than one list missing.

**Research** — notes on the platform, an API surface, or another library. Never has checkboxes,
because there is nothing to complete. Say what you read and when, since the subject moves: a note on
React Native 0.86's performance APIs is only true of 0.86.

## Writing rules

- **Why, not what.** The same rule the code follows. A note that restates what the source plainly
  says is a note that will be wrong within a month.
- **Name the constraint.** The useful half of a plan is what the platform refuses to do, not the part
  that went smoothly.
- **No file paths or function names in the feature list** — describe what somebody using the package
  gets. Everywhere else, be as concrete as you like.
- **Lowercase kebab-case filenames.** `network-conditions-plan.md`, not `NetworkConditions.md`.
  `README.md` is the exception, since tooling and npm look for that name.
- **Link the real file, never the symlink.** GitHub renders a symlink as the path it points at rather
  than as the document, so a reader who lands on one sees a stub:
  `[feature list](../packages/@axonpack/expo-devtools/notes/README.md)`.
- **Wrap prose at 100 columns.** Prettier leaves prose alone, so this one is on you; run
  `bun run format` from the repo root for everything else.
- **Delete rather than annotate.** A section marked "outdated, see below" is two sections to read. Git
  remembers the old one.

## A note for Windows checkouts

Git needs `core.symlinks` on (Developer Mode, or `git config core.symlinks true` before cloning) to
create these as real links. Without it every file under `notes/@axonpack/` is written as a small text
file containing a path. Nothing breaks — no note links through a symlink — but read the real files
under `packages/` instead.
