import Link from 'next/link';
import { content } from '@/lib/services/content.service';
import { packages } from '@/lib/services/packages.service';
import { SectionHeading } from '@/components/section-heading';

const { libraries } = content;

/** Story order from content.json first, then any package npm has that content.json doesn't name yet. */
const order = Object.keys(libraries.stories);
const rank = (slug: string) => (order.includes(slug) ? order.indexOf(slug) : order.length);
export const listed = [...packages].sort((a, b) => rank(a.slug) - rank(b.slug));

/** Every published package on one screen. The version and the downloads are npm's, read at build time. */
export function LibraryIndex() {
  return (
    <section id="libraries" aria-labelledby="libraries-title" className="scroll-mt-20 border-t px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading id="libraries-title" title={libraries.title} body={libraries.body} />
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listed.map((pkg) => (
            <li key={pkg.name}>
              <Link
                href={pkg.hasDocs ? pkg.docsHref : pkg.npmHref}
                className="flex h-full flex-col rounded-xl border bg-fd-card p-5 transition-colors hover:border-fd-primary/60"
              >
                <span className="text-[1.0625rem] font-semibold tracking-tight">{pkg.title}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-fd-muted-foreground text-pretty">
                  {libraries.lines[pkg.slug] ?? pkg.description}
                </span>
                <span className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fd-muted-foreground">
                  <span className="font-mono">v{pkg.version}</span>
                  {pkg.weeklyDownloads !== null && (
                    <span>{pkg.weeklyDownloads.toLocaleString('en')} downloads last week</span>
                  )}
                  <span className="ms-auto font-medium text-fd-primary">Docs</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
