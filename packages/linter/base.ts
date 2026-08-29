import { defineConfig } from "oxlint";
import native from "oxlint-config-universe/native";

/**
 * Shared oxlint rules for @axonpack/* packages. Consuming packages extend this from their own
 * `oxlint.config.mts`:
 *
 * ```ts
 * import { defineConfig } from "oxlint";
 * import base from "linter";
 *
 * export default defineConfig({
 *   extends: [base],
 *   ignorePatterns: ["build"], // package-specific
 * });
 * ```
 *
 * The rules themselves come from `oxlint-config-universe/native` — the maintained oxlint port of
 * `eslint-config-universe`, which is what these packages were linted with before the migration and
 * what Expo's own packages extend today. This file used to be 2,600 lines: the `@oxlint/migrate`
 * output, which inlined universe's whole rule set, ~1,200 lines of browser globals, and an override
 * targeting `.web.` files that this repo does not have. Extending the package instead means the
 * rules stay current without anyone re-running a migration.
 *
 * NOTE: oxlint does not inherit `ignorePatterns` through `extends`
 * (https://github.com/oxc-project/oxc/issues/10223). This config deliberately declares none, so
 * nothing is silently lost today — but if any are added here, every consuming config has to re-apply
 * them with `ignorePatterns: [...base.ignorePatterns, ...]`.
 */
const base = defineConfig({
  extends: [native],
  rules: {
    // universe wants braces on every branch. This codebase has always used single-line guard clauses
    // (`if (!page) return;`) and Prettier does not add braces, so turning it on means 539 warnings
    // about a style decision already made — with nothing behavioural behind any of them.
    curly: "off",
  },
  overrides: [
    {
      // `noUnusedLocals` and `noUnusedParameters` are on in every package's TypeScript config, so tsc
      // already reports each unused binding — as a hard error rather than a warning. Leaving the lint
      // rule on means one line is flagged twice by two tools that disagree on severity.
      files: ["**/*.ts", "**/*.tsx", "**/*.d.ts"],
      rules: {
        "no-unused-vars": "off",
        "typescript/no-unused-vars": "off",
      },
    },
  ],
});

export default base;
