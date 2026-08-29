import Link from 'next/link';
import type { Metadata } from 'next';
import { packageHref, packages } from '@/lib/packages';

// `/docs` is not a page in `content/`, and a static export has no server to answer a redirect with.
// So this is a real, prerendered page that bounces to the overview and stays readable if it can't.
const target = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/docs/overview/`;

export const metadata: Metadata = {
  title: 'Documentation',
  robots: { index: false, follow: true },
};

export default function DocsIndexPage() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
          <p className="mt-2 text-fd-muted-foreground">
            Taking you to the{' '}
            <Link className="underline" href="/docs/overview">
              overview
            </Link>
            . Or pick a package:
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {packages.map((pkg) => (
            <li key={pkg.slug}>
              <Link className="font-mono text-sm underline" href={packageHref(pkg)}>
                {pkg.name}
              </Link>
              {pkg.status === 'planned' && (
                <span className="ml-2 text-xs text-fd-muted-foreground">planned</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
