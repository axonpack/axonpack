import { defineConfig } from "oxlint";
import base from "@bruin/linter";

export default defineConfig({
  extends: [base],
  ignorePatterns: ["build"],
});
