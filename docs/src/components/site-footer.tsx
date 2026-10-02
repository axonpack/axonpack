import Link from 'next/link';
import { Logo } from './logo';
import { content } from '@/lib/services/content.service';
import { packages } from '@/lib/services/packages.service';
import { appName } from '@/lib/shared';

const isExternal = (href: string) => /^https?:/.test(href);
const COL = 'mb-3 text-xs font-semibold tracking-wider text-fd-muted-foreground uppercase';
const LINK = 'block py-1 text-sm text-fd-muted-foreground transition-colors hover:text-fd-primary';

/** Ported from the Astro site. No interactivity, so it stays a server component. */
export function SiteFooter() {
  return (
    <footer className="border-t px-5 pt-14 pb-10 bg-fd-background">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="mb-3 flex items-center gap-2 font-bold">
              <Logo size={24} />
              {appName}
            </div>
            <p className="max-w-[30ch] text-sm text-fd-muted-foreground">{content.footer.blurb}</p>
          </div>

          {/* From npm, so a new library appears here the same build it appears everywhere else. */}
          <div>
            <h3 className={COL}>Libraries</h3>
            {packages.map((pkg) => (
              <Link key={pkg.name} href={pkg.docsHref} className={LINK}>
                {pkg.title}
              </Link>
            ))}
          </div>

          {content.footer.columns.map((column) => (
            <div key={column.title}>
              <h3 className={COL}>{column.title}</h3>
              {column.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  {...(isExternal(link.href) && { target: '_blank', rel: 'noreferrer noopener' })}
                  className={LINK}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-12 border-t pt-6 text-[0.8125rem] text-fd-muted-foreground">
          {content.footer.legal}
        </div>
      </div>
    </footer>
  );
}
