import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;

// `staticGET`, not `GET`: a static export has no server to run a search endpoint, so the whole index
// is written out at build time and queried in the browser. See `src/components/search.tsx`.
//
// The route is `search.json` rather than `search` so the export lands on disk with an extension.
// GitHub Pages types and compresses a file by its extension: extensionless, this ~1.2 MB index is
// served as application/octet-stream and uncompressed; as .json it is served gzipped, near 240 KB.
export const { staticGET: GET } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
  // The default builder, plus a tag. One index still covers every package — the tag is what lets a
  // reader inside one package stop seeing the others, which is the part that gets worse with each
  // library added, not the file size.
  async buildIndex(page) {
    return {
      id: page.url,
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      structuredData: await page.data.structuredData,
      // The first slug segment is the root folder, which is the tab, which is the package.
      tag: page.slugs[0],
    };
  },
});
