import { getPageImageUrl, getPagePackage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { appLongName } from '@/lib/shared';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();
  const pkg = getPagePackage(page);

  return new ImageResponse(
    <DefaultImage
      title={page.data.title}
      description={page.data.description}
      // A shared card for "Overview" means nothing without the package it belongs to.
      site={pkg ? `${appLongName} / ${pkg.npmName}` : appLongName}
    />,
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImageUrl(page).segments,
  }));
}
