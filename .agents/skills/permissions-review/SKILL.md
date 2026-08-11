---
name: permissions-review
description: Audit what a native change actually obliges an app to declare — runtime permissions, iOS required-reason APIs and privacy manifests, Android manifest merging, entitlements. Trigger before adding or reviewing native code, or on "does this need a permission", "permission review", "privacy manifest", "required reason API", "is this safe to ship".
---

# Permissions review

Run this before shipping native code, and any time someone asks "does this need a permission?". The
answer is usually "no runtime permission" and that is usually **not the whole answer** — which is the
entire reason this skill exists.

## 1. Separate the three tiers before saying anything

Most wrong answers come from collapsing these:

| Tier                       | What it costs                                                      | Examples                                                                                      |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **Runtime permission**     | A user-facing prompt, and a denial path to handle                  | Android dangerous permissions; iOS APIs behind a usage-description prompt                     |
| **Declaration obligation** | No prompt, but the app fails review or build without a declaration | iOS required-reason APIs (`PrivacyInfo.xcprivacy`), entitlements, Android `<uses-permission>` |
| **Nothing**                | Free                                                               | Reading your own process's memory; your own app-private directories                           |

"No permission needed" answers tier 1 only. Say which tier each API is in, explicitly.

## 2. Enumerate the actual APIs, from the diff

Don't reason about the feature — list the calls. Grep the native sources for what the change added, per
platform, and write them down. You cannot classify what you haven't enumerated, and a single innocuous
looking helper (`attributesOfFileSystem`, `getInstalledPackages`) is usually where the obligation hides.

## 3. Never answer from memory — fetch the current list

These lists change. Fetch them:

- iOS required-reason APIs:
  https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- Android permissions reference (check whether each is `normal` or `dangerous`):
  https://developer.android.com/reference/android/Manifest.permission
- Apple privacy manifest keys:
  https://developer.apple.com/documentation/bundleresources/privacy-manifest-files

Categories that have caught people out, all with **no runtime prompt**: disk space, system boot time,
file timestamps, active keyboards, `UserDefaults`. If the change touches any of those areas, assume an
obligation until the fetched docs say otherwise.

## 4. Apply the library multiplier

This is the step that changes decisions. **In a library, every obligation is exported to every consumer
app.** An `<uses-permission>` in a library manifest merges into theirs. A required-reason API in a
library forces a declaration in their privacy manifest or their submission is rejected — for a feature
they may not even use.

So the question is never just "is this allowed?". It is:

> Is this metric worth making every consumer declare something?

For anything marginal, the answer is no. Prefer dropping the feature over exporting the obligation.
Gating it behind a config flag does **not** help: the API call is still in the binary, and the
obligation follows the binary.

## 5. Decide, then make the decision durable

Three outcomes: **keep** (free), **declare** (worth it — ship the declaration in the library so
consumers inherit it, and say so in the readme), or **drop**.

Whichever it is, record _why_ in two places, or it gets silently re-added by the next person who notices
the gap:

- a comment at the code site, or where the feature would have gone
- the user-facing docs, in the "what this deliberately doesn't do" section

## 6. Flag adjacency honestly

If the change uses something _near_ a listed API, say so rather than claiming clearance. Reading
`KERN_PROC` for your own process is not `kern.boottime`, and isn't on the list — but it is close enough
that the right output is "not listed, worth re-checking before submission", not "fine".

## Output

A short verdict table — API, platform, tier, decision — then what was dropped and why. State plainly
which claims came from a fetched doc and which are judgement.

Nothing is settled until the native code compiles. A permissions review of code that has never built is
a review of a guess.
