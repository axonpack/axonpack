import { getPageMarkdownUrl, getPosts, source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export function GET() {
  // fumadocs links each page's HTML and has no option to change that. An agent wants the markdown
  // copy, so every docs link is swapped for it, absolute so it can be fetched as written.
  const markdown = new Map(
    source.getPages().map((page) => [page.url, new URL(getPageMarkdownUrl(page).url, siteUrl).href]),
  );
  const docs = llms(source)
    .index()
    .replace(/\]\(([^)]*)\)/g, (link, url: string) => (markdown.has(url) ? `](${markdown.get(url)})` : link));
  const posts = getPosts().map((post) => `- [${post.data.title}](${post.url}): ${post.data.description}`);
  // Products keep their docs on their own sites, so this points at their index instead of copying it.
  const products = '- [Axon Shaft](https://shaft.axonpack.dev/docs/llms.txt): pull request reviews with Claude, as a GitHub Action and a dashboard';
  return new Response(`${docs}\n\n# Products\n\n${products}\n\n# Blog\n\n${posts.join('\n')}\n`);
}
