import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Star } from 'lucide-react';
import { InstallChip } from '@/components/copy-button';
import { DevtoolsPanel } from '@/components/devtools-panel';
import { StarCount } from '@/components/star-count';
import { content } from '@/lib/services/content.service';

// The accent half of the headline is the tail, so the words carry on counting rather than restarting.
const words = [
  ...content.hero.title.split(' ').map((word) => ({ word, accent: false })),
  ...content.hero.titleAccent.split(' ').map((word) => ({ word, accent: true })),
];

/** Type, two actions and the product. No scenery: the page's own background is the background. */
export function Hero() {
  return (
    <header className="px-6 pt-24 pb-20 sm:pt-32">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-[clamp(2.25rem,1.2rem+3.4vw,3.5rem)] leading-[1.08] font-semibold tracking-[-0.035em] text-balance">
          {words.map(({ word, accent }, i) => (
            <span
              key={`${word}-${i}`}
              className={`rise mr-[0.25em] inline-block ${accent ? 'text-fd-primary' : ''}`}
              style={{ animationDelay: `${60 + i * 45}ms` }}
            >
              {word}
            </span>
          ))}
        </h1>

        <p className="rise mt-5 text-[0.9375rem] leading-relaxed text-fd-muted-foreground text-pretty [animation-delay:420ms]">
          {content.hero.lead}
        </p>

        <div className="rise mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:500ms]">
          <Link
            href="/docs/"
            className="group inline-flex h-10 items-center gap-2 rounded-lg bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-transform hover:-translate-y-px"
          >
            Read the docs
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href={content.hero.actions[1].href}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            {content.hero.actions[1].label}
            <StarCount className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs tabular-nums">
              <Star className="size-3 fill-current" />
            </StarCount>
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5" />
          </a>
        </div>

        <div className="rise [animation-delay:580ms]">
          <InstallChip command={content.hero.install} />
        </div>
      </div>

      <div className="rise mx-auto mt-20 max-w-5xl [animation-delay:660ms]">
        <DevtoolsPanel />
      </div>
    </header>
  );
}
