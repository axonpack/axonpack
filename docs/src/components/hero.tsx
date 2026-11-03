import Link from 'next/link';
import { ArrowUpRight, Star } from 'lucide-react';
import { AgentTerminal } from '@/components/agent-terminal';
import { InstallChip } from '@/components/copy-button';
import { DevtoolsPanel } from '@/components/devtools-panel';
import { StarCount } from '@/components/star-count';
import { content } from '@/lib/services/content.service';

/**
 * Centred, as the hero always was. Below the type, the panel on the phone and an agent's terminal
 * reading the same failed request. The terminal arrives last on purpose: it is the one moment the
 * load sequence builds to.
 */
export function Hero() {
  const { hero } = content;

  return (
    <header className="hero-shade px-5 pt-20 pb-14 sm:pt-28 sm:pb-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="rise text-[clamp(2.25rem,1.2rem+3.4vw,3.5rem)] leading-[1.08] font-semibold tracking-[-0.035em] text-balance [animation-delay:60ms]">
          {hero.title} <span className="text-fd-primary">{hero.titleAccent}</span>
        </h1>

        <p className="rise mt-5 text-[0.9375rem] leading-relaxed text-fd-muted-foreground text-pretty [animation-delay:180ms]">
          {hero.lead}
        </p>

        <div className="rise mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:260ms]">
          <Link
            href={hero.actions[0].href}
            className="inline-flex h-10 items-center rounded-lg bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-transform hover:-translate-y-px"
          >
            {hero.actions[0].label}
          </Link>
          <a
            href={hero.actions[1].href}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            {hero.actions[1].label}
            <StarCount className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs tabular-nums">
              <Star className="size-3 fill-current" aria-hidden="true" />
            </StarCount>
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div className="rise [animation-delay:340ms]">
          <InstallChip command={hero.start.command} label="Copy the skills command" />
          <p className="mt-3 text-sm text-fd-muted-foreground">
            {hero.start.ask}{' '}
            <q className="font-mono text-[0.8125rem] text-fd-foreground max-sm:mt-1 max-sm:block">{hero.start.prompt}</q>
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-fd-muted-foreground text-pretty">{hero.start.note}</p>
          <p className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
            {hero.start.links.map((link) => (
              <Link key={link.href} href={link.href} className="font-medium text-fd-primary underline-offset-4 hover:underline">
                {link.label}
              </Link>
            ))}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl sm:mt-20">
        <div role="img" aria-label={hero.panelLabel} className="rise [animation-delay:420ms]">
          <DevtoolsPanel />
        </div>
        {/* Overlaps the panel's lower right on wide screens. In flow rather than absolute, so the
            header's own padding is what clears it. */}
        <AgentTerminal className="rise relative mx-auto mt-4 max-w-[36rem] [animation-delay:800ms] lg:-mt-24 lg:-me-10" />
      </div>
    </header>
  );
}
