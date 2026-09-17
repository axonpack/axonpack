import { defineConfig } from '@rsbuild/core';

/**
 * The Network tab's page.
 *
 * Plain TypeScript and DOM, no framework. The page is a table, a form and a few panels, and a
 * framework would be larger than the thing it renders.
 */
export default defineConfig({
  source: { entry: { index: './src/index.ts' } },
  html: { template: './src/index.html' },
  output: {
    distPath: { root: '../dist/panel' },
    // Served from a sub-path of the dev server, so every asset URL has to be relative.
    assetPrefix: './',
    cleanDistPath: true,
  },
  performance: { chunkSplit: { strategy: 'all-in-one' } },
});
