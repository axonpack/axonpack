import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { defineCollections, defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';
import { title } from './services/packages.service';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

const posts = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: pageSchema.extend({
    description: z.string(),
    author: z.string(),
    // YAML reads `2026-11-03` as a string, and a plain day avoids a time zone shifting it.
    date: z.iso.date(),
    // Shown above the post and used as its share card. Without one, the card is generated.
    image: z.string().optional(),
  }),
});

/** Blog posts, one MDX file each in `content/blog/`, served at /blog/<file name>/. */
export const blog = loader({ baseUrl: '/blog', source: posts.toFumadocsSource() });

export type Post = (typeof blog)['$inferPage'];

// ISO days compare correctly as strings.
export const getPosts = () => blog.getPages().sort((a, b) => b.data.date.localeCompare(a.data.date));

export function getPageImageUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    // Deliberately *not* prefixed: this is only ever handed to `metadata.openGraph.images`, and Next
    // resolves that against `metadataBase`, whose own path already carries the prefix. Adding it here
    // produces /docs/docs/og/...
    url: '/' + [page.locale, ...docsImageRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    // Deliberately *not* prefixed. Next defines `import.meta.env.BASE_URL` from `basePath`, and
    // fumadocs' page actions run this URL through their own `withBasePath` before fetching or
    // linking it. Prefixing here as well produces /docs/docs/llms.mdx/...
    url: '/' + [page.locale, ...docsContentRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}

/**
 * The package a page documents, read from its section's `meta.json`, so a new package folder gets
 * its name into titles and structured data with nothing else to edit. Undefined for pages that sit
 * outside a package section, which today is only the docs home.
 */
export function getPagePackage(page: (typeof source)['$inferPage']) {
  const dir = page.path.split('/').slice(0, -1)[0];
  if (!dir) return;

  for (const node of source.getPageTree().children) {
    if (node.type !== 'folder' || !node.root) continue;
    const meta = source.getNodeMeta(node);
    if (meta?.path !== `${dir}/meta.json`) continue;

    return {
      title: meta.data.title ?? title(dir),
      description: meta.data.description,
      // Matches the README's rule that `@axonpack/x` lives at /docs/x/.
      npmName: `@axonpack/${dir}`,
      url: node.index?.url ?? `${docsRoute}/${dir}`,
    };
  }
}
