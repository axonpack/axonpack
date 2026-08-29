import path from 'node:path';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// bun hoists workspace dependencies to the repo root, so `next` itself lives above this directory.
// Turbopack refuses to compile anything outside its root, and infers that root from the nearest
// lockfile — which is the repo root here. Say so explicitly rather than relying on the inference.
const workspaceRoot = path.join(import.meta.dirname, '..', '..');

// GitHub Pages serves a project site under `/<repo>`, so every asset and route needs that prefix.
// A custom domain or a `<org>.github.io` repo serves from the root instead — leave it unset there.
// The deploy workflow is what sets it; local dev and previews run without it.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  basePath,
  // Pages resolves `/foo/` to `/foo/index.html`. Without this, export writes `foo.html`, which works
  // on Pages but breaks any host that doesn't guess the extension.
  trailingSlash: true,
  // There is no server to optimise images on.
  images: { unoptimized: true },
  reactStrictMode: true,
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
};

export default withMDX(config);
