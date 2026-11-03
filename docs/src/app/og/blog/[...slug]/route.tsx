import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { blog } from '@/lib/source';
import { appLongName } from '@/lib/shared';

export const revalidate = false;

/** A share card per post, and one for the index, which also keeps the route from ever being empty. */
export async function GET(_req: Request, { params }: RouteContext<'/og/blog/[...slug]'>) {
  const { slug } = await params;
  const postSlug = slug.slice(0, -1);
  const post = postSlug.length > 0 ? blog.getPage(postSlug) : undefined;
  if (postSlug.length > 0 && !post) notFound();

  // No description: the generator doesn't wrap a long title and description apart, so they overlap.
  // The share preview shows the description from the page's own metadata anyway.
  return new ImageResponse(
    <DefaultImage title={post?.data.title ?? 'Blog'} site={`${appLongName} / Blog`} />,
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams() {
  return [{ slug: ['image.png'] }, ...blog.getPages().map((post) => ({ slug: [...post.slugs, 'image.png'] }))];
}
