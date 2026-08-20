# Writing the notes

How the markdown under `notes/@axonpack/` is organised and written. Read this before adding a file.

## Every note lives with its package

A note about a package is a file **in that package**, under its own `notes/` folder.
`notes/@axonpack/<pkg>/` holds nothing but symlinks to them, so the whole tree can be read in one
place without a second copy of anything existing.

| The real file                            | The symlink                         | Holds                                                      |
| ---------------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| `packages/<pkg>/notes/README.md`         | `@axonpack/<pkg>/index.md`          | The index: one row per note                                |
| `packages/<pkg>/notes/<area>.md`         | `@axonpack/<pkg>/<area>.md`         | One area: its features, its design, its limits             |
| `packages/<pkg>/notes/<feature>-plan.md` | `@axonpack/<pkg>/<feature>-plan.md` | How one **unbuilt** feature will be built                  |
| `packages/<pkg>/notes/<topic>.md`        | `@axonpack/<pkg>/<topic>.md`        | Research: how a platform or another library actually works |

A package's `notes/` folder is published to npm with it, so the index is that folder's `README.md`
and renders on sight. A package's `docs/` folder, where it has one, is for the images its README
links to.

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

**Every feature belongs to exactly one area note, and that note is the only place its status
lives.** No combined list, no second copy in the package README, none in a plan. A plan says what it
intends to build; a log says what happened; the package README says how to use what exists. If two
files would tick the same box, one of them is wrong.

## The four kinds

**An index** — the package's `notes/README.md`. A table of the notes beside it and the rules for
editing them. No features of its own.

**An area note** — one per surface. Features first as a checklist, then the prose that explains how
it works and what forced the design, then **Won't do** at the end for what the platform makes
impossible. Each area note carries its own editing rules by way of the index; follow those.

**A plan** — written before the work, and it does not outlive it. Name it `<feature>-plan.md`. It
may use checkboxes freely while the work is open, because it is describing a sequence. **The day the
feature ships, the plan moves to `logs/`** — its checkboxes stop being true the moment the area note
says the feature is built, and two lists disagreeing is worse than one list missing.

**Research** — notes on the platform, an API surface, or another library. Never has checkboxes,
because there is nothing to complete. Say what you read and when, since the subject moves: a note on
React Native 0.86's performance APIs is only true of 0.86.

## Writing rules

- **Why, not what.** The same rule the code follows. A note that restates what the source plainly
  says is a note that will be wrong within a month.
- **Name the constraint.** The useful half of a note is what the platform refuses to do, not the
  part that went smoothly.
- **No file paths or function names in a checklist** — describe what somebody using the package
  gets. In the prose below it, be as concrete as you like.
- **Lowercase kebab-case filenames.** `network-conditions-plan.md`, not `NetworkConditions.md`.
  `README.md` is the exception, since tooling and npm look for that name.
- **Link the real file, never the symlink.** GitHub renders a symlink as the path it points at
  rather than as the document, so a reader who lands on one sees a stub:
  `[network](../packages/@axonpack/expo-devtools/notes/network.md)`.
- **Wrap prose at 100 columns.** Prettier leaves prose alone, so this one is on you; run
  `bun run format` from the repo root for everything else.
- **Delete rather than annotate.** A section marked "outdated, see below" is two sections to read.
  Git remembers the old one.

## A note for Windows checkouts

Git needs `core.symlinks` on (Developer Mode, or `git config core.symlinks true` before cloning) to
create these as real links. Without it every file under `notes/@axonpack/` is written as a small
text file containing a path. Nothing breaks — no note links through a symlink — but read the real
files under `packages/` instead.
