# Force and skip

Deciding which updates are mandatory, and what people can put off.

- [x] An update is mandatory when the installed version is below a minimum you set
- [x] An update is mandatory when you say every update is, or every update of a size or bigger
- [x] An update is mandatory when your own rule says so, or when your endpoint reports it
- [x] A mandatory update cannot be postponed or skipped
- [x] People can postpone a soft update until the app next starts
- [x] People can skip a version, and it stays skipped until a newer one comes out
- [x] A skip is remembered in memory, or in storage you hand over so it survives a restart
- [x] Skipping can be switched off for soft updates
- [x] Reports how big the update is: major, minor, patch, prerelease or build
- [x] Compares only the first parts of a version, so patch releases never prompt

## What the design turns on

**Forced is a result, not a mode of the modal.** The check says whether an update is forced, and the
prompt only draws it. That keeps the rule in one place for people who build their own screen.

**A skip is exact.** It remembers the one version skipped, so the next release prompts again
without any timer or counter to maintain.

## Won't do

- **Blocking the app from the library.** It reports that an update is mandatory and draws the
  prompt. Locking the rest of the app is the app's decision.
