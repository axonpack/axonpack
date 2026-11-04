---
"@axonpack/expo-devtools": minor
---

- **Supports**: optional integrations with other packages, each from its own entry point, `@axonpack/expo-devtools/support/<name>/v<major>`, and never the main entry. `<major>` is the major version of the package it supports, so a new major of that package gets a new entry. Turn one on with `supports: [Support.configure(config)]`. A default import, a namespace import and `import { configure }` all work, and each support exports its package's config types and `DevtoolsSupport`
- **A missing package never crashes the app**: with a support used and its package not installed, or on another major, the start logs what to do with `console.error` and the support's tab shows the same message. Two versions of one support in `supports`: the first is used and the other is logged. Installed but not used, the package is never loaded
- **Preview support**, the first: `import PreviewV0Support from "@axonpack/expo-devtools/support/preview/v0"`, for `@axonpack/preview` 0.x, mounts `@axonpack/preview`'s provider around your app and adds a Preview tab to the panel and to React Native DevTools. Its provider stays mounted with `enabled: false`, so a preview's start is still confirmed
