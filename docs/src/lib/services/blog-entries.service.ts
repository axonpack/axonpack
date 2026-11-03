import { packages } from '@/lib/services/packages.service';

/**
 * Releases are not written by hand. Each is a section of a library's CHANGELOG.md, parsed at build
 * time and dated from npm's publish times.
 *
 * Posts are written by hand and live apart from these, as MDX in `content/blog/`, read through
 * `blog` in `lib/source.ts`.
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
