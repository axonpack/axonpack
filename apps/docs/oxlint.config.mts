import { defineConfig } from "oxlint";
import base from "linter";

// The shared base is written for the React Native packages; a Next.js app adds the framework's own
// rules on top and turns off the ones that only make sense with a bundler-less React runtime.
export default defineConfig({
  extends: [base],
  plugins: ["import", "node", "react", "unicorn", "typescript", "nextjs"],
  settings: {
    react: { version: "19.2" },
  },
  ignorePatterns: [".next", ".source", "next-env.d.ts"],
});
