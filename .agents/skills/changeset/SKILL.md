---
name: changeset
description: Write a properly-formatted Changesets entry (a new .changeset/*.md file) for shipped work in any Changesets-based repo — correct package targeting, correct bump level, always as a humanized, client-facing simple list. Trigger on "changeset", "add a changeset", "write the changelog", "changelog entry", "release notes".
---

# Changeset / Changelog

A changeset is a pending release note + semver bump, folded into each package's `CHANGELOG.md` later by the CLI. It's always written for the client — a humanized, simple list, never developer-speak. Never guess conventions; look first.

## 1. Look before writing

- Read `.changeset/config.json`: `ignore`, `fixed`/`linked` groups, `updateInternalDependencies`, and whether the `changelog` generator is custom.
- Skim 3–5 recent `.changeset/*.md` files (not `README.md`) — the freshest signal of house style.
- Skim the top of each target package's `CHANGELOG.md` for how entries read once merged.
- A root `CONTRIBUTING.md`/`CLAUDE.md` changelog policy, if one exists, overrides everything below.

## 2. Always write for the client, not the developer

"Client" here means the end customer/user of the product — not an API client or data-fetching client. The changelog is a client-facing document, full stop — even for internal/shared packages, assume a non-technical reader on the other end. Every bullet must be:

- **Humanized** — plain, everyday language, like explaining the change to a person, not a machine.
- **Simple** — one short sentence per bullet, no sub-clauses stacked on sub-clauses.
- **A list** — bullets only, no prose paragraphs, no nested explanations.

Never mention file/component/function/type names, internal architecture, frameworks, config keys, or ticket numbers. Say what changed _for the person using it_, nothing about _how_.

## 3. Is it even worth an entry?

Only include changes a client can actually notice or benefit from. Refactors, internal tests, lint/format, dependency bumps with no visible behavior change, tooling — skip. If nothing in the diff is client-observable, write **no changeset**, not a padded one.

## 4. Headings

Match whatever this package's own recent changesets already use. Default (works almost everywhere):

```
## ✨ Features
## 🐛 Bug Fixes
```

Drop whichever heading has no items this time. Don't invent extra ones ("Improvements", "Chores", etc.) — if it doesn't fit Feature or Fix, it's probably not client-observable, so it doesn't belong in the changelog at all (see step 3).

## 5. Writing rules

- One bullet per observable change — don't bundle or split unnecessarily.
- Lead with the effect, not the mechanism ("X no longer does Y", not "refactored the Y handler").
- Bold a feature's name once if it has one; nothing else.
- Be specific and short — "various fixes" helps no one.

```md
## ✨ Features

- You can now request a day off right from your profile, and see the status of past requests.

## 🐛 Bug Fixes

- Switching branch or location no longer gets stuck on the loading screen.
```

Anti-pattern — this is developer-speak, never write like this:

```md
- Refactored the date picker's seed logic to clamp against min/max bounds
- Added maximumDate prop to the Start Date input in rdo-request.component.tsx
```

## 6. Bump level (standard semver)

`major` = breaking · `minor` = new backward-compatible capability · `patch` = fix/small tweak. Confirm `major` with the user rather than inferring it from diff size.

## 7. Which package(s)? — always ask, every time

Never decide this silently, even when it seems obvious.

1. Derive candidate packages from actual changed files (`git diff --name-only`) mapped to workspace packages — not habit/intuition.
2. Check for a bundling/embedding relationship (one package's output ships inside another) and check `updateInternalDependencies` in `.changeset/config.json` — use these only to form a suggested default, not to decide silently.
3. Ask the user directly, every time:
   - **One changeset per affected package, or a single changeset?** List the candidate packages found in step 1 as context.
   - If single: **which one package should it target?**
4. Write the changeset file(s) matching whatever they choose — one file per package if "each," one file (possibly listing several packages in its frontmatter) if "one."

## 8. File

`.changeset/<descriptive-kebab-case-name>.md` — named after the change, not a ticket ID. One file can hold multiple bullets/headings for one body of work.

**Always produce a changeset file — never hand-edit a `CHANGELOG.md` directly**, even to backfill a missed entry.

## 9. Final check

For each bullet: would a client understand it without reading the code, and would they care? If not, rewrite or cut it.
