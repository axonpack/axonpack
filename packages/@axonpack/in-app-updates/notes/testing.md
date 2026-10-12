# Testing

Trying the update flow without publishing a release.

- [x] Fake a release in a development build, with versions, release notes and a minimum version
- [x] A fake never takes effect in a release build
- [x] A fake Google Play that plays out every outcome in a debuggable Android build
- [x] An example app with one chip for each state of the prompt
- [x] The example installs under your own app id and version, so the stores answer for it
- [x] The pure decision can be run without a request or a version source
- [ ] A recorded store answer to replay, for tests that must not touch the network

## What the design turns on

**A fake is off by construction.** It is read only when the app is in a development build, so
nothing has to be removed before shipping.

**The fake Play stands in for Google, not for the user.** It plays Play and the person, so it checks
the package's own handling, not Google's screens. The real flow is tested with Play's internal app
sharing.

## Won't do

- **Show the real Play consent dialog from a fake.** It is Google's screen, and it only opens for a
  real Play install.
