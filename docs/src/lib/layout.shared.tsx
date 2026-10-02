import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Logo } from '@/components/logo';
import { appName, gitConfig } from './shared';
import { documented, packages } from './services/packages.service';
import { getReleases } from './services/blog-entries.service';
import { navLink } from './services/content.service';

/**
 * The navbar is fumadocs' own. Its `links` support `type: 'menu'`, which is a hover dropdown with
 * keyboard handling, a mobile drawer and the search and theme controls already wired in. A
 * hand-rolled version of this was tried and did not open reliably; there is no reason to own it.
 */
export function baseOptions(): BaseLayoutProps {
  const releases = getReleases();
  const community = navLink('Community');

  return {
    nav: {
      title: (
        <>
          <Logo />
          <span className="text-lg font-bold tracking-tight">{appName}</span>
        </>
      ),
      url: '/',
    },
    links: [
      { text: 'Docs', url: '/docs', active: 'nested-url' },
      {
        type: 'menu',
        text: 'Libraries',
        // Discovered from npm, so publishing a library adds it to the nav with nothing to edit.
        items: packages.map((pkg) => ({
          text: pkg.title,
          description: pkg.description,
          url: pkg.docsHref,
        })),
      },
      {
        type: 'menu',
        text: 'Blog',
        items: [
          { text: 'Writing', description: 'Nothing published yet', url: '/blog' },
          // Each library keeps its changelog in its own docs, so the menu lists them rather than
          // linking one aggregate page. Only the documented ones: a package can be on npm before
          // its pages are written, and linking to those 404s.
          ...documented.map((pkg) => ({
            text: `${pkg.title} changelog`,
            description: `v${pkg.version}, ${releases.filter((r) => r.library === pkg.slug).length} releases`,
            url: `${pkg.docsHref}changelog`,
          })),
        ],
      },
      ...(community?.menu
        ? [
            {
              type: 'menu' as const,
              text: 'Community',
              items: community.menu.flatMap((group) =>
                group.items.map((item) => ({ text: item.label, url: item.href })),
              ),
            },
          ]
        : []),
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
