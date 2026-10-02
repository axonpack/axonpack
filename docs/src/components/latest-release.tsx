import Link from 'next/link';
import { releases } from '@/lib/releases.generated';

/**
 * The version and the link to what changed, on a package's overview page. Both come from
 * `releases.generated.ts`, which the changelog sync writes — so the version advertised here can
 * never drift from the changelog it points at.
 */
export function LatestRelease({ slug }: { slug: string }) {
  const release = releases[slug];
  if (!release) return null;

  return (
    <Link
      href={`/docs/${slug}/changelog/`}
      className="not-prose my-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-fd-card px-4 py-3 text-sm no-underline transition-colors hover:bg-fd-accent"
    >
      <span className="rounded-md bg-fd-primary px-2 py-0.5 font-mono text-xs font-medium text-fd-primary-foreground">
        v{release.version}
      </span>
      <span className="text-fd-muted-foreground">Released {release.date}</span>
      <span className="ms-auto font-medium">What changed →</span>
    </Link>
  );
}

/**
 * The current major as a `3.x` range, for the compatibility table. Reads the same generated record
 * as `LatestRelease` above. A version typed into a table cell is the one thing on this site no build
 * step corrects, so that cell still claimed 2.5.x after 3.0.0 shipped.
 */
export function VersionRange({ slug }: { slug: string }) {
  const version = releases[slug]?.version;
  if (!version) return null;
  return <code>{version.split('.')[0]}.x</code>;
}
