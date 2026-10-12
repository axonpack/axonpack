# Store check

Finding out whether the store has a newer build of the app than the one installed.

- [x] Asks the App Store for the latest version, release notes and release date
- [x] Asks the Play Store for the latest version by reading its public page
- [x] Asks your own JSON endpoint, in a shape you choose or one the package reads by default
- [x] Tries one source after another, so a store page that cannot be read does not leave people stuck
- [x] Tries a second country when the app is not listed in the device's own
- [x] Compares versions with one, two, three or more numbers, dates, calendar versions and beta or canary tags
- [x] Takes your own comparison for a format it cannot read
- [x] Counts a higher build number as an update when the version is the same
- [x] On Android, reads the new build number from Google Play when its update module is present
- [x] Keeps an answer for a few minutes, retries a failed request once, and gives up after a timeout
- [x] Names every failure with its own error, or logs a warning and carries on
- [x] Reads the installed version, build and bundle id from Expo, or from values you hand over
- [ ] Checking while the app is closed

## What the design turns on

**The comparison is lenient on purpose.** Stores and app configs ship `1`, `1.2`, `1.2.3.4` and dates
as well as strict semver, so a strict parser would reject versions people really use. A tag sorts
below its release, and the usual stages sort in shipping order.

**A build number only ever counts upward.** It breaks a tie when the version matches. It never makes
an older store build look newer, and a store that reports no build number simply has no tiebreak.

**Nothing optional is imported at load.** The Expo modules are read inside a `try`, in the one shape
Metro accepts as optional, so a project without one still bundles.

## Won't do

- **A build number from the App Store.** Its lookup does not report one, and Apple needs a new
  version string for every store release, so the version alone is the signal on iOS.
- **Release notes from Google Play.** Play has no API for them, and its page does not carry them.
- **A guaranteed Play version.** Play has no API for the version either, so the page is read. If
  Google changes the page, the check fails with a clear error instead of guessing.
