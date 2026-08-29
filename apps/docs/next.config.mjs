import path from 'node:path';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// bun hoists workspace dependencies to the repo root, so `next` itself lives above this directory.
// Turbopack refuses to compile anything outside its root, and infers that root from the nearest
// lockfile — which is the repo root here. Say so explicitly rather than relying on the inference.
const workspaceRoot = path.join(import.meta.dirname, '..', '..');

// Unset in every current deployment: the site is served from https://axonpack.github.io, an
// organisation root with no path prefix. It stays wired up because the day the site moves under a
// subpath — a project site at `/<repo>`, say — that prefix has to reach both `basePath` here and the
// search index URL in `src/components/search.tsx`, and finding that out later is expensive.
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
