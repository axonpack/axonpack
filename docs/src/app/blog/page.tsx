import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getReleases } from '@/lib/services/blog-entries.service';
import { documented } from '@/lib/services/packages.service';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Writing about the Axonpack libraries. Release notes live in the changelog.',
  alternates: { canonical: '/blog/' },
};

export default function BlogPage() {
  const count = getReleases().length;
  // Release notes live in each library's docs now, so the button goes to the only one that ships.
  // With more than one there is no single page to send people to, so it falls back to the index.
  const href = documented.length === 1 ? `${documented[0].docsHref}changelog/` : '/docs/';
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-20">
      <h1 className="text-[clamp(2rem,1.4rem+2vw,3rem)] leading-tight font-semibold tracking-[-0.03em]">Blog</h1>
      <p className="mt-4 text-fd-muted-foreground text-pretty">
        Writing about the libraries and how they are built.
      </p>
      <div className="mt-12 rounded-lg border bg-fd-card p-8 text-center">
        <p className="text-fd-muted-foreground">
          Nothing written yet. There is a changelog though, and it is not short.
        </p>
        <Link
          href={href}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fd-primary px-5 text-sm font-medium text-fd-primary-foreground"
        >
          Read the changelog
          <span className="rounded-full bg-fd-primary-foreground/15 px-2 py-0.5 text-xs tabular-nums">{count}</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </main>
  );
}
