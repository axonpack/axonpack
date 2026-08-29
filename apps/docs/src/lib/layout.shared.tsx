import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { shippedPackages } from './packages';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image src="/logo.png" alt="" width={22} height={22} className="rounded-sm" />
          <span className="font-semibold">{appName}</span>
        </>
      ),
      url: '/',
    },
    links: [
      { text: 'Docs', url: '/docs/overview', active: 'nested-url' },
      // One per shipped package. The sidebar's own tab switcher is the full list; this is the
      // shortcut for however few of them there are.
      ...shippedPackages.map((pkg) => ({
        text: pkg.slug,
        url: `/docs/${pkg.slug}`,
        active: 'nested-url' as const,
      })),
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
