import type { Metadata } from 'next';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import { SiteNav } from '@/components/site-nav';
import { Hero } from '@/components/hero';
import { LibraryGrid } from '@/components/library-grid';
import { Principles } from '@/components/principles';
import { content } from '@/lib/services/content.service';

export const metadata: Metadata = {
  // The headline names the project itself now, so prefixing it with the long name said it twice.
  title: { absolute: `${content.hero.title} ${content.hero.titleAccent}` },
  description: content.hero.lead,
  alternates: { canonical: '/' },
};

/** Composes only. Each section is its own component, per the monorepo's CONVENTIONS.md. */
export default function HomePage() {
  return (
    <HomeLayout {...baseOptions()} slots={{ header: SiteNav }}>
      <main className="flex flex-1 flex-col">
        <Hero />
        <LibraryGrid />
        <Principles />
      </main>
    </HomeLayout>
  );
}
