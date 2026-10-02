import { packages } from '@/lib/services/packages.service';

/**
 * Releases are not written by hand. Each is a section of a library's CHANGELOG.md, parsed at build
 * time and dated from npm's publish times.
 *
 * Posts used to live alongside these in an Astro content collection. There are none yet, and this
 * app has fumadocs' MDX pipeline available for when there are, so nothing here reads a collection.
 */
export type ReleaseEntry = {
  date: Date;
  library: string;
  version: string;
  bump: string | null;
  items: string[];
  /** The library's docs, for readers who want the feature rather than the note. */
  href: string;
  anchor: string;
};

export const getReleases = (): ReleaseEntry[] =>
  packages
    .flatMap((pkg) =>
      pkg.releases
        .filter((release) => release.date)
        .map((release) => ({
          date: new Date(release.date!),
          library: pkg.slug,
          version: release.version,
          bump: release.bump,
          items: release.items,
          href: pkg.docsHref,
          anchor: `${pkg.slug}-${release.version.replace(/\./g, '-')}`,
        })),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());
