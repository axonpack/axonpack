import { defineConfig } from "oxlint";
import base from "linter";

export default defineConfig({
  extends: [base],
  ignorePatterns: ["build"],
});
