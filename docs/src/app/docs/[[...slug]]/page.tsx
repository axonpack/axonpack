import { getPageImageUrl, getPageMarkdownUrl, getPagePackage, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { findNeighbour } from 'fumadocs-core/page-tree';
import { appLongName, canonicalPath, docsRoute, gitConfig, pageSourceUrl, siteUrl } from '@/lib/shared';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  // The footer renders whatever it is handed; it does not work its own neighbours out of the tree.
  const neighbours = findNeighbour(source.getPageTree(), page.url);

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      breadcrumb={{ enabled: true }}
      footer={{ enabled: true, items: neighbours }}
    >
      {jsonLd(page).map((data) => (
        <script
          key={data['@type']}
          type="application/ld+json"
          // `<` is escaped so a title can never close the script tag early.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
        />
      ))}
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={pageSourceUrl(page.path)}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const pkg = getPagePackage(page);
  const url = canonicalPath(page.url);

  return {
    // Every package's index page is called "Overview", so the package name is what tells them
    // apart in a tab or a search result. The root template adds the site name after it.
    title: pkg ? `${page.data.title} - ${pkg.title}` : page.data.title,
    description: page.data.description,
    keywords: pkg ? [pkg.npmName, pkg.title] : undefined,
    alternates: { canonical: url },
    // Next replaces the parent's `openGraph` rather than merging into it, so the site name and
    // locale have to be restated here or a docs page's card loses them. Twitter falls back to
    // these, so it needs nothing of its own.
    openGraph: {
      type: 'article',
      siteName: appLongName,
      locale: 'en_US',
      url,
      images: getPageImageUrl(page).url,
    },
  };
}

/** A breadcrumb on every package page, and the package itself on its index page. */
function jsonLd(page: (typeof source)['$inferPage']) {
  const pkg = getPagePackage(page);
  if (!pkg) return [];

  const absolute = (path: string) => new URL(canonicalPath(path), siteUrl).href;
  const trail = [
    { name: 'Docs', path: docsRoute },
    { name: pkg.title, path: pkg.url },
    ...(page.url === pkg.url ? [] : [{ name: page.data.title, path: page.url }]),
  ];

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
  if (page.url !== pkg.url) return [breadcrumb];

  return [
    breadcrumb,
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      name: pkg.npmName,
      alternateName: pkg.title,
      description: pkg.description ?? page.data.description,
      url: absolute(pkg.url),
      codeRepository: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
      programmingLanguage: 'TypeScript',
    },
  ];
}
