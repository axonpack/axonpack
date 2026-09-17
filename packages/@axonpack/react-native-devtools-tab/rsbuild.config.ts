import { defineConfig } from "@rsbuild/core";

/**
 * One build: the Metro plugin Node loads.
 *
 * Nothing else here is compiled. The app-side entry is read from source by a React Native bundler,
 * which reads TypeScript directly, and a tab's page is built by the consumer's own Metro, from their
 * own code, so this package ships no page of its own.
 */
export default defineConfig({
  environments: {
    node: {
      source: { entry: { index: "./src/metro/index.ts" } },
      output: {
        target: "node",
        distPath: { root: "dist/metro" },
        filename: { js: "[name].cjs" },
      },
      tools: {
        rspack: {
          output: {
            module: false,
            chunkFormat: "commonjs",
            library: { type: "commonjs2" },
          },
        },
      },
    },
  },
  output: { cleanDistPath: true },
});
