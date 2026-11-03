import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogIndex } from '@/components/blog-index';
import { BlogPost } from '@/components/blog-post';
import { blog } from '@/lib/source';
import { appLongName, canonicalPath } from '@/lib/shared';

/**
 * The index and every post in one route, as /docs does it. With `output: 'export'` a dynamic route
 * that generates no page fails the build, and the index is always one of these, so a blog with no
 * posts still builds.
 */
export default async function Page(props: PageProps<'/blog/[[...slug]]'>) {
  const { slug } = await props.params;
  if (!slug) return <BlogIndex />;

  const post = blog.getPage(slug);
  if (!post) notFound();

  return <BlogPost post={post} />;
}

export function generateStaticParams() {
  return [{ slug: [] }, ...blog.getPages().map((post) => ({ slug: post.slugs }))];
}

export async function generateMetadata(props: PageProps<'/blog/[[...slug]]'>): Promise<Metadata> {
  const { slug } = await props.params;
  // Next replaces the layout's `openGraph` rather than merging, so the site name and locale are
  // restated, as on the docs pages.
  const openGraph = { siteName: appLongName, locale: 'en_US' };

  if (!slug) {
    return {
      title: 'Blog',
      description: 'Writing about the Axonpack libraries. Release notes live in the changelog.',
      alternates: { canonical: '/blog/' },
      openGraph: { ...openGraph, type: 'website', url: '/blog/', images: '/og/blog/image.png' },
    };
  }

  const post = blog.getPage(slug);
  if (!post) notFound();

  const url = canonicalPath(post.url);

  return {
    title: post.data.title,
    description: post.data.description,
    authors: [{ name: post.data.author }],
    alternates: { canonical: url },
    openGraph: {
      ...openGraph,
      type: 'article',
      url,
      publishedTime: post.data.date,
      authors: [post.data.author],
      images: post.data.image ?? `/og/blog/${post.slugs.join('/')}/image.png`,
    },
  };
}
