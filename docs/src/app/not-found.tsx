import Link from 'next/link';
import type { Metadata } from 'next';
import { appName, gitConfig } from '@/lib/shared';

// A static export serves this as 404.html, which is what GitHub Pages hands back for any unknown
// path. It is the only page a mistyped or stale URL ever reaches, anywhere on the site, so it
// points at the site as a whole rather than assuming the reader was looking for the docs.
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

const destinations = [
  { href: '/', label: 'Home', hint: `What ${appName} is` },
  { href: '/docs/', label: 'Docs', hint: 'Guides and reference for every library' },
  { href: '/docs/expo-devtools/changelog/', label: 'Changelog', hint: 'Every release, newest first' },
  {
    href: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    label: 'GitHub',
    hint: 'Source, issues and releases',
    external: true,
  },
];

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-5 py-24">
      <div>
        <p className="font-mono text-sm text-fd-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page does not exist</h1>
        <p className="mt-2 text-fd-muted-foreground">
          It may have moved, or the link that sent you here may be out of date.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {destinations.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              {...(item.external && { target: '_blank', rel: 'noreferrer noopener' })}
              className="block rounded-lg border bg-fd-card p-4 transition-colors hover:border-fd-primary"
            >
              <span className="font-medium">{item.label}</span>
              <span className="mt-0.5 block text-sm text-fd-muted-foreground">{item.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
