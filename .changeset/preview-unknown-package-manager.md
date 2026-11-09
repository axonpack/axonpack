---
"@axonpack/preview": patch
---

- **Publish names a package manager it can't install with**: for a `nub.lock`, or any lockfile other than npm's, Yarn's, pnpm's and bun's, `preview publish` stops before copying the project and says to run it with `--in-place`, where 0.3.0 failed with `Cannot read properties of undefined (reading 'join')`
- **No `--keep-copy` hint when nothing was copied**: an error from before the copy, such as no lockfile, no longer ends with `Run again with --keep-copy to look inside the copy.`
