---
name: changeset
description: Write a properly-formatted Changesets entry (a new .changeset/*.md file) for shipped work in any Changesets-based repo — correct package targeting, correct bump level, always as a compact, capability-first list a client can skim. Trigger on "changeset", "add a changeset", "write the changelog", "changelog entry", "release notes".
---

# Changeset / Changelog

A changeset is a pending release note + semver bump, folded into each package's `CHANGELOG.md` later by the CLI.

**The goal of every entry: the client skims it and knows what they can now do.** Nothing else. Not why it's good, not what it used to do, not how it was built. Never guess conventions; look first.

## 1. Look before writing

- Read `.changeset/config.json`: `ignore`, `fixed`/`linked` groups, `updateInternalDependencies`, and whether the `changelog` generator is custom.
- Skim 3–5 recent `.changeset/*.md` files (not `README.md`) — the freshest signal of house style.
- Skim the top of each target package's `CHANGELOG.md` for how entries read once merged.
- **Check what's actually released.** Compare the package `version` and the top of `CHANGELOG.md` against everything still sitting in `.changeset/`. Everything pending ships in one release — that determines what belongs in your entry (see step 4).
- A root `CONTRIBUTING.md`/`CLAUDE.md` changelog policy, if one exists, overrides everything below.

## 2. Compact and capability-first

"Client" means the end customer/user of the product — not an API client. Assume a non-technical reader, even for internal/shared packages.

- **One short line per capability.** Roughly one clause. If a bullet needs a comma-spliced second half to survive, it's two bullets or it's overwritten.
- **Lead with the capability name**, bolded, then a dash, then what it does. `- **Shift Details** — tap any shift to see everything about it in one place.`
- **Bullets only.** No prose paragraphs, no nested explanation, no sub-bullets.
- Never name files, components, functions, types, architecture, frameworks, config keys, or ticket numbers.

## 3. The cut list

These are the things that make an entry read as padded or machine-written. Cut them on sight.

**Justification tails** — anything after the capability explaining why it's good:

| ✗                                                                                                    | ✓                                                                      |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| The clock-in button now shows a spinner while it checks your location, **so you know it's working**. | The clock-in button now shows a spinner while it checks your location. |
| Week view shows colour-coded badges, **so you can see what's on at a glance**.                       | Week view shows colour-coded badges for each day.                      |
| The eMAR Report now shows management notes, **so you see the same information as on the web app**.   | The eMAR Report now shows management notes.                            |

**"instead of \<old behaviour\>" contrasts** — "now does X" already implies it didn't before. Watch the whole file: more than one or two across a batch reads as a template.

| ✗                                                                                   | ✓                                                                                  |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| The app now asks you to turn location back on **instead of letting clock-in fail**. | If your phone's location is switched off, the app now asks you to turn it back on. |
| Custom shift codes display fully in Month view **instead of getting cut off**.      | Custom shift codes now display fully in Month view.                                |

`no longer …` carries the same contrast without the construction — use it for variety.

**Paragraph bullets** — one line stacking four capabilities. Split into one bullet each, or cut to the headline capability.

**Vague filler** — "various fixes", "layout and spacing improved for easier use", "text now matches the app's design". If you can't name what the client sees, cut the bullet.

## 4. Is it even worth an entry?

Only changes a client can notice. Skip refactors, tests, lint/format, dependency bumps, tooling. If nothing in the diff is client-observable, write **no changeset**.

**Also skip fixes to features that haven't shipped yet.** If the broken behaviour only ever existed in a still-pending changeset, the client never saw it — "the Requests tab no longer crashes" reads as _we shipped it broken_. Fold the work into the pending feature entry describing the shipped end state, and delete the fix file.

Same rule for work that contradicts a pending entry: **amend the pending changeset**, never add a second one that corrects it.

## 5. Headings

Match this package's recent changesets. Default:

```
## ✨ Features
## 🐛 Bug Fixes
```

Drop a heading with no items. Don't invent others ("Improvements", "Chores") — if it fits neither, it isn't client-observable (step 4).

A ✨ Features entry is usually all a release needs. 🐛 Bug Fixes is for repairs to behaviour the client has actually lived with.

## 6. Bump level (standard semver)

`major` = breaking · `minor` = new capability · `patch` = fix/small tweak. Confirm `major` with the user rather than inferring it from diff size. A new capability filed under Bug Fixes is a miscategorisation — check the heading and the bump agree.

## 7. Which package(s)? — always ask, every time

Never decide this silently, even when it seems obvious.

1. Derive candidate packages from actual changed files (`git diff --name-only`) mapped to workspace packages — not habit/intuition.
2. Check for a bundling/embedding relationship (one package's output ships inside another) and `updateInternalDependencies` in `.changeset/config.json` — use these to form a suggested default, not to decide silently.
3. Ask the user directly, every time:
   - **One changeset per affected package, or a single changeset?** List the candidates from step 1 as context.
   - If single: **which one package should it target?**
4. Write the file(s) matching whatever they choose.

## 8. File

`.changeset/<descriptive-kebab-case-name>.md` — named after the change, not a ticket ID. One file holds one body of work.

**Always produce a changeset file — never hand-edit a `CHANGELOG.md` directly**, even to backfill a missed entry.

## 9. Final check

Read the batch as the client will see it — all pending files together, as one release.

- Is every bullet one skimmable line naming something they can now do?
- Any tail explaining why it's good? Any "instead of"? Cut.
- Does any bullet fix something they never had? Fold it in.
- Would the whole release fit on a phone screen?
