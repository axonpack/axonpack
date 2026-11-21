import type { Metadata } from 'next';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import { SiteNav } from '@/components/site-nav';
import { Hero } from '@/components/hero';
import { AgentSection } from '@/components/agent-section';
import { LibraryGrid } from '@/components/library-grid';
import { Products } from '@/components/products';
import { Principles } from '@/components/principles';
import { content } from '@/lib/services/content.service';
import { appName } from '@/lib/shared';

export const metadata: Metadata = {
  title: { absolute: `${appName}: ${content.hero.title}` },
  description: content.hero.description,
  alternates: { canonical: '/' },
};

/** Composes only. Each section is its own component, per the monorepo's CONVENTIONS.md. */
export default function HomePage() {
  return (
    <HomeLayout {...baseOptions()} slots={{ header: SiteNav }}>
      <main className="landing flex flex-1 flex-col">
        <Hero />
        <Products />
        <AgentSection />
        <LibraryGrid />
        <Principles />
      </main>
    </HomeLayout>
  );
}
