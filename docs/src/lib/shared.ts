/**
 * Two names, deliberately. `appName` is what appears in chrome where space is tight and the reader
 * already knows where they are — the nav, a browser tab suffix. `appLongName` is the full name, used
 * where the site introduces itself to someone who has not seen it before: a shared link's title, an
 * OG card, a search result.
 */
export const appName = 'Axonpack';
export const appLongName = 'Axonpack Open Source';
export const appTagline = 'Free, open source tools and libraries for React and React Native.';

// The docs sit under their own segment now. This app serves the organisation root, so `/` is the
// landing page and the docs tree hangs off /docs. Fumadocs builds every page URL from this.
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

/** The project. Used for the nav link, which is about Axonpack as a whole. */
export const gitConfig = {
  user: 'axonpack',
  repo: 'axonpack',
  branch: 'main',
};

/**
 * The repository these pages live in, which is this one. Kept separate from `gitConfig` because a
 * page's "open in GitHub" link has to resolve to the file, and the file is not in the monorepo.
 */
export const docsRepo = {
  user: 'axonpack',
  repo: 'axonpack.github.io',
  branch: 'main',
};

export const pageSourceUrl = (path: string) =>
  `https://github.com/${docsRepo.user}/${docsRepo.repo}/blob/${docsRepo.branch}/content/docs/${path}`;

/**
 * The deployed origin. `metadataBase` resolves every relative URL in the metadata against it, and
 * the sitemap and robots routes need it spelled out, since neither is metadata and neither sees
 * `metadataBase`. The override is for a preview deploy on some other origin.
 */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://axonpack.github.io';

/**
 * `next.config.mjs` sets `trailingSlash`, so /docs/foo is a redirect and /docs/foo/ is the page.
 * A canonical or a sitemap entry pointing at the redirect asks a crawler to follow a hop to find
 * the page it was already told about, so both go through here.
 */
export const canonicalPath = (path: string) => (path.endsWith('/') ? path : `${path}/`);
