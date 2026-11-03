import { getPosts, source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export function GET() {
  const posts = getPosts().map((post) => `- [${post.data.title}](${post.url}): ${post.data.description}`);
  return new Response(`${llms(source).index()}\n\n# Blog\n\n${posts.join('\n')}\n`);
}
