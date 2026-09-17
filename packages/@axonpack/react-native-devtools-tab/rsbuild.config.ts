import { defineConfig } from "@rsbuild/core";

/**
 * Two builds, one tool.
 *
 * Only two things here have to be compiled: the page a browser loads, and the Metro plugin Node
 * loads. The app-side entry does not, because the only thing that ever imports it is a React Native
 * bundler, which reads TypeScript directly — so that export points at source and its types come from
 * the same file rather than from a generated `.d.ts`.
 */
export default defineConfig({
  environments: {
    /** The page shown inside the tab. */
    web: {
      source: { entry: { index: "./src/renderer/main.ts" } },
      html: { template: "./src/renderer/index.html" },
      output: {
        target: "web",
        distPath: { root: "dist/renderer" },
        // Served from a sub-path of the dev server, so every asset URL has to be relative.
        assetPrefix: "./",
      },
      performance: { chunkSplit: { strategy: "all-in-one" } },
    },

    /** The Metro plugin. Self-contained: its only imports are Node built-ins. */
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
