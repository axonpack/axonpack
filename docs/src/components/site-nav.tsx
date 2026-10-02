'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { ChevronDown, Menu, X } from 'lucide-react';
import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import { Logo } from './logo';
import { Icon } from '@/components/icon';
import { StarCount } from '@/components/star-count';
import { appName, gitConfig } from '@/lib/shared';
import { documented, packages } from '@/lib/services/packages.service';
import { getReleases } from '@/lib/services/blog-entries.service';
import { navLink } from '@/lib/services/content.service';

/**
 * Radix's NavigationMenu, because it opens on pointer enter with a configurable delay and handles
 * keyboard, focus and dismissal itself. Fumadocs' own navbar menus are click-to-open: their only
 * hover handler is on the mobile collapsible trigger, so `links: type: 'menu'` could never do this.
 *
 * Search and the theme switch are still fumadocs', so they stay consistent with the docs pages and
 * keep talking to the same providers.
 *
 * Rendered through fumadocs' `slots.header`, which supplies header props and nothing else, so the
 * menu data is read here rather than passed in: a closure made in a server component cannot cross
 * the client boundary.
 */

const TRIGGER =
  'group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground';
const PANEL =
  'absolute left-0 top-[calc(100%+8px)] flex gap-6 rounded-lg border bg-fd-popover p-4 shadow-2xl';
const HEADING = 'mb-1 ml-2 text-[0.6875rem] font-semibold tracking-wider text-fd-muted-foreground uppercase';
const ENTRY = 'block rounded-lg p-2 transition-colors hover:bg-fd-accent';

type Entry = { label: string; href: string; note?: string; badge?: string; external?: boolean };
type Column = { title: string; entries: Entry[]; footer?: { label: string; href: string } };

export function SiteNav(props: React.ComponentProps<'header'>) {
  const [drawer, setDrawer] = useState(false);
  const releases = getReleases();
  const community = navLink('Community');

  const menus: { id: string; label: string; columns: Column[] }[] = [
    {
      id: 'libraries',
      label: 'Libraries',
      columns: [
        {
          title: 'Published',
          entries: packages.map((pkg) => ({
            label: pkg.title,
            href: pkg.docsHref,
            note: pkg.description,
            badge: `v${pkg.version}`,
          })),
        },
      ],
    },
    {
      id: 'blog',
      label: 'Blog',
      columns: [
        {
          title: 'Writing',
          entries: [],
          footer: { label: 'Blog', href: '/blog/' },
        },
        {
          title: 'Changelog',
          // One entry per library, pointing at the changelog in its own docs. That page is
          // newest-first, so the latest release is already at the top and the link needs no anchor
          // to chase — which also means nothing here has to mirror fumadocs' heading-slug rule.
          // Only documented packages: npm can list one whose pages do not exist yet.
          entries: documented.map((pkg) => ({
            label: pkg.title,
            href: `${pkg.docsHref}changelog/`,
            badge: `v${pkg.version}`,
            note: `${releases.filter((r) => r.library === pkg.slug).length} releases`,
          })),
        },
      ],
    },
    ...(community?.menu
      ? [
          {
            id: 'community',
            label: 'Community',
            columns: community.menu.map((group) => ({
              title: group.title,
              entries: group.items.map((item) => ({
                label: item.label,
                href: item.href,
                external: /^https?:/.test(item.href),
              })),
            })),
          },
        ]
      : []),
  ];

  const entryLink = (entry: Entry) => (
    <NavigationMenu.Link asChild key={entry.href}>
      <Link
        href={entry.href}
        {...(entry.external && { target: '_blank', rel: 'noreferrer noopener' })}
        className={ENTRY}
      >
        <span className="flex items-center gap-2 text-sm">
          {entry.label}
          {entry.badge && (
            <span className="rounded-full border bg-fd-secondary px-2 py-0.5 font-mono text-[0.7rem] text-fd-muted-foreground">
              {entry.badge}
            </span>
          )}
        </span>
        {entry.note && (
          <span className="mt-0.5 block text-xs text-fd-muted-foreground">{entry.note}</span>
        )}
      </Link>
    </NavigationMenu.Link>
  );

  return (
    // The grid-area matters only on docs pages: DocsLayout lays its children out in a named grid
    // ("sidebar sidebar header toc toc"), and a header that claims no area gets auto-placed. That
    // dropped it into the first column, 229px wide of a 390px phone, with its own controls
    // overflowing. Naming the area is what fumadocs' own header does. Spanning every column
    // instead is wrong: the sidebar occupies columns 1 and 2 on every row, so the two overlap.
    <header {...props} className="[grid-area:header] sticky top-0 z-40 bg-fd-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
          <Logo />
          {appName}
        </Link>

        <NavigationMenu.Root delayDuration={80} className="relative max-lg:hidden">
          <NavigationMenu.List className="flex items-center gap-0.5">
            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href="/docs/" className={TRIGGER}>
                  Docs
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>

            {menus.map((menu) => (
              <NavigationMenu.Item key={menu.id} className="relative">
                <NavigationMenu.Trigger className={TRIGGER}>
                  {menu.label}
                  <ChevronDown className="size-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className={PANEL}>
                  {menu.columns.map((column) => (
                    <div key={column.title} className="min-w-56">
                      <h3 className={HEADING}>{column.title}</h3>
                      {column.entries.length === 0 && (
                        <p className="p-2 text-sm text-fd-muted-foreground">Nothing published yet.</p>
                      )}
                      {column.entries.map(entryLink)}
                      {column.footer && (
                        <NavigationMenu.Link asChild>
                          <Link
                            href={column.footer.href}
                            className="mt-1 flex items-center gap-1 border-t p-2 pt-3 text-sm text-fd-primary hover:underline"
                          >
                            {column.footer.label}
                          </Link>
                        </NavigationMenu.Link>
                      )}
                    </div>
                  ))}
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            ))}
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="ms-auto flex items-center gap-2">
          {/* Below lg both of these live in the drawer instead: at phone width the header has no
              room for them beside the logo, and a search box worth typing into needs real width. */}
          <FullSearchTrigger className="max-lg:hidden" />
          <ThemeSwitch className="max-lg:hidden" />
          <a
            href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${appName} on GitHub`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <Icon name="github" className="size-4" />
            <StarCount className="text-xs font-medium tabular-nums max-sm:hidden" />
          </a>
          <button
            type="button"
            aria-label={drawer ? 'Close menu' : 'Open menu'}
            aria-expanded={drawer}
            onClick={() => setDrawer(!drawer)}
            className="grid size-9 place-items-center rounded-lg border text-fd-muted-foreground lg:hidden"
          >
            {drawer ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile: one flat list. Nested hover menus are meaningless on a touch screen. */}
      {drawer && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t px-5 pb-6 lg:hidden">
          <div className="flex items-center gap-2 py-3">
            {/* The shortcut hint is dead weight on a device with no ⌘, so the box takes that width. */}
            <FullSearchTrigger className="flex-1 [&_kbd]:hidden" />
            <ThemeSwitch />
          </div>
          <Link href="/docs/" className="block py-2 text-base">
            Docs
          </Link>
          {menus.map((menu) => (
            <div key={menu.id} className="mt-3">
              <h3 className={HEADING}>{menu.label}</h3>
              {menu.columns.map((column) => (
                <div key={column.title}>
                  {/* The desktop panel puts columns side by side under their own titles. Flattened
                      into one list those titles are what stops "expo-devtools" under Blog reading
                      as a post rather than that library's changelog. */}
                  {menu.columns.length > 1 && column.entries.length > 0 && (
                    <p className="mt-2 ms-2 text-xs text-fd-muted-foreground">{column.title}</p>
                  )}
                  {column.entries.map((entry) => (
                    <Link key={entry.href} href={entry.href} className={ENTRY}>
                      <span className="text-sm">{entry.label}</span>
                    </Link>
                  ))}
                  {column.footer && (
                    <Link href={column.footer.href} className={`${ENTRY} text-fd-primary`}>
                      <span className="text-sm">{column.footer.label}</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
