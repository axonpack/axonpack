import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/shared';

/**
 * Open, apart from the search index. `/api/search.json` is one big blob of every page's text, so a
 * crawler that reads it gets the whole site again with none of the structure.
 *
 * `/llms.txt` and `/llms.mdx/` stay allowed on purpose: they exist so an agent's crawler can read
 * the docs, and disallowing them would shut out the readers they were written for.
 */
// `output: 'export'` refuses to build a metadata route that has not said it is static.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: new URL('/sitemap.xml', siteUrl).href,
  };
}
