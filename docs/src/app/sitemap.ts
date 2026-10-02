import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { canonicalPath, siteUrl } from '@/lib/shared';

/**
 * Every static page on the site. The docs half comes from fumadocs' own source rather than a
 * hand-kept list, so writing a page is the only step: there is no second place to forget.
 *
 * `output: 'export'` is on, so this runs once at build time and lands in `out/sitemap.xml`.
 */
// `output: 'export'` refuses to build a metadata route that has not said it is static.
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // The docs index is one of `getPages()`, so listing it here as well put it in twice.
  const fixed = ['/', '/blog'];
  const docs = source.getPages().map((page) => page.url);

  return [...fixed, ...docs].map((path) => ({
    url: new URL(canonicalPath(path), siteUrl).href,
    lastModified,
  }));
}
