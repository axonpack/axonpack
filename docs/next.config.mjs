import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// This directory is the whole project, and it is mounted into the axonpack monorepo as a submodule
// at `docs/`. Pinning Turbopack's root here stops it inferring one from a lockfile further up
// when it is checked out inside that monorepo.
const projectRoot = import.meta.dirname;

// No basePath. This repo is named axonpack.github.io, so Pages serves it as the organisation root
// site and the app owns "/" directly. The docs live under a real /docs route segment instead of
// borrowing one from the prefix.
/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  // Pages resolves `/foo/` to `/foo/index.html`. Without this, export writes `foo.html`, which works
  // on Pages but breaks any host that doesn't guess the extension.
  trailingSlash: true,
  // There is no server to optimise images on.
  images: { unoptimized: true },
  reactStrictMode: true,
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  // Next 16 serves /_next/* only to allowed hosts, so opening the dev server on the LAN IP to
  // check the mobile layout 403s every chunk: the page renders but nothing hydrates. A bare '*'
  // is rejected as a host pattern, so this names the subnet and survives DHCP moving the last octet.
  allowedDevOrigins: ['*.*.*.*'],
};

export default withMDX(config);
