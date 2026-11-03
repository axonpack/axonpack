import Link from 'next/link';
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { content } from '@/lib/services/content.service';
import { Prose } from '@/components/prose';
import { packages } from '@/lib/services/packages.service';

const { libraries } = content;

/**
 * Story order comes from content.json. A package npm has that content.json has no story for still
 * shows, last, with its npm description, so publishing one never leaves it off the page. A story
 * for a package npm does not have never shows, which keeps unshipped work off the site.
 */
const order = Object.keys(libraries.stories);
const rank = (slug: string) => (order.includes(slug) ? order.indexOf(slug) : order.length);
const listed = [...packages].sort((a, b) => rank(a.slug) - rank(b.slug));

/**
 * One package per row: the scene that sends someone looking for it, what it does about it, and a
 * sample from its docs. The version, downloads and links come from npm, so they are what is
 * actually published.
 */
export function LibraryGrid() {
  return (
    <section aria-labelledby="libraries-title" className="border-t px-5 pt-20 pb-8 sm:pt-28 sm:pb-12">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="libraries-title"
            className="text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] leading-tight font-semibold tracking-[-0.03em] text-balance"
          >
            {libraries.title}
          </h2>
          <p className="mt-4 text-fd-muted-foreground text-pretty">{libraries.body}</p>
        </div>

        <div className="mt-12 divide-y border-t">
          {listed.map((pkg) => {
            const story = libraries.stories[pkg.slug];
            return (
              <article
                key={pkg.name}
                aria-labelledby={`pkg-${pkg.slug}`}
                className="grid grid-cols-1 gap-8 py-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-14"
              >
                <div className="min-w-0">
                  <h3
                    id={`pkg-${pkg.slug}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[1.5rem] leading-tight font-semibold tracking-[-0.02em]"
                  >
                    {pkg.title}
                    <span className="font-mono text-xs font-normal tracking-normal text-fd-muted-foreground">
                      v{pkg.version}
                    </span>
                  </h3>

                  {story ? (
                    <>
                      <p className="mt-5 border-s-2 ps-4 leading-relaxed text-fd-muted-foreground text-pretty">
                        <Prose text={story.scene} />
                      </p>
                      <p className="mt-4 leading-relaxed text-pretty"><Prose text={story.fix} /></p>
                    </>
                  ) : (
                    <p className="mt-5 leading-relaxed text-pretty">{pkg.description}</p>
                  )}

                  <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <Link
                      href={pkg.hasDocs ? pkg.docsHref : pkg.npmHref}
                      className="font-medium text-fd-primary underline-offset-4 hover:underline"
                    >
                      {pkg.title} docs
                    </Link>
                    <a
                      href={pkg.npmHref}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-fd-muted-foreground underline-offset-4 hover:text-fd-foreground hover:underline"
                    >
                      npm
                    </a>
                    {pkg.totalDownloads !== null && (
                      <span className="text-fd-muted-foreground">
                        {pkg.totalDownloads.toLocaleString('en')} downloads
                      </span>
                    )}
                    {pkg.license && <span className="text-fd-muted-foreground">{pkg.license}</span>}
                  </p>
                </div>

                {story && (
                  <div className="min-w-0">
                    <ServerCodeBlock
                      code={story.sample.code}
                      lang={story.sample.lang}
                      codeblock={{ title: story.sample.title }}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
