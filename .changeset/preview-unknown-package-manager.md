---
"@axonpack/preview": minor
---

- **Publish works in a nub project**: with a `nub.lock`, `preview publish` installs the copy with `nub install --frozen-lockfile`, where 0.3.0 failed with `Cannot read properties of undefined (reading 'join')`. Your app's `@expo/package-manager` must be 1.14 or later
- **Your EAS scripts under nub**: `eas-build-pre-install` runs as `nub run --node`, without nub's TypeScript support, and `eas-build-post-install` as `nub run`
- **No `--keep-copy` hint when nothing was copied**: an error from before the copy, such as no lockfile, no longer ends with `Run again with --keep-copy to look inside the copy.`
