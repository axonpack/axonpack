import Link from 'next/link';
import { Download, Package } from 'lucide-react';
import { BUMP_STYLES } from '@/lib/constants/bump-styles.const';
import { formatDate } from '@/lib/utils/format-date.util';
import { packages } from '@/lib/services/packages.service';

/**
 * A card per library. Everything on it comes from npm and from the package's own changelog, so it
 * says what is actually published rather than what someone remembered to write down: the version,
 * the keywords the package ships with, its licence, its downloads and its last few releases.
 *
 * An `article` rather than one big link, because the card carries several of its own. A link inside
 * a link is invalid, and the whole card being one target would make the changelog unreachable.
 *
 * A package without docs points at npm instead. Publishing is one job and writing the pages is
 * another, so a card cannot assume the second happened.
 */
export function LibraryGrid() {
  return (
    <section className="border-b px-5 py-24">
      <div className="reveal mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-tight font-semibold tracking-tight text-balance">
            Libraries
          </h2>
          <p className="mt-4 text-fd-muted-foreground text-pretty">
            Every library is released and documented on its own, and this list comes straight from
            npm. If it is here, it is installable today.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <article
              key={pkg.name}
              className="relative flex flex-col rounded-xl border bg-fd-card p-5 transition-colors hover:border-fd-primary"
            >
              <div className="flex items-center gap-2">
                <Package className="size-4 shrink-0 text-fd-primary" />
                <h3 className="font-medium tracking-tight">
                  <Link
                    href={pkg.hasDocs ? pkg.docsHref : pkg.npmHref}
                    className="after:absolute after:inset-0 hover:underline"
                  >
                    {pkg.title}
                  </Link>
                </h3>
                <span className="ms-auto rounded-full border bg-fd-secondary px-2 py-0.5 font-mono text-[0.7rem] text-fd-muted-foreground">
                  v{pkg.version}
                </span>
              </div>

              <p className="mt-3 text-sm text-fd-muted-foreground text-pretty">{pkg.description}</p>

              {pkg.keywords.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {/* Six is what fits on two rows at the narrowest the card gets. */}
                  {pkg.keywords.slice(0, 6).map((keyword) => (
                    <li
                      key={keyword}
                      className="rounded-full border px-2 py-0.5 text-[0.7rem] text-fd-muted-foreground"
                    >
                      {keyword}
                    </li>
                  ))}
                </ul>
              )}

              {pkg.releases.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-[0.7rem] font-medium tracking-wide text-fd-muted-foreground uppercase">
                      Recent releases
                    </h4>
                    {pkg.hasChangelog && (
                      <Link
                        href={`${pkg.docsHref}changelog`}
                        className="relative z-10 text-xs text-fd-primary hover:underline"
                      >
                        All {pkg.releases.length} &rarr;
                      </Link>
                    )}
                  </div>
                  <ul className="mt-2.5 space-y-2">
                    {pkg.releases.slice(0, 3).map((release) => (
                      <li key={release.version} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-fd-foreground">{release.version}</span>
                        {release.bump && (
                          <span
                            className={`rounded-full border px-1.5 py-px text-[0.65rem] ${BUMP_STYLES[release.bump] ?? BUMP_STYLES.patch}`}
                          >
                            {release.bump}
                          </span>
                        )}
                        {release.date && (
                          <span className="ms-auto text-fd-muted-foreground">
                            {formatDate(new Date(release.date))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pushed down so the footers line up however long the descriptions above them are. */}
              <div className="mt-auto flex items-center gap-3 pt-5 text-xs text-fd-muted-foreground">
                {pkg.totalDownloads !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Download className="size-3" />
                    {pkg.totalDownloads.toLocaleString()} downloads
                  </span>
                )}
                {pkg.license && <span>{pkg.license}</span>}
                <a
                  href={pkg.npmHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="relative z-10 ms-auto hover:text-fd-foreground"
                >
                  npm ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
