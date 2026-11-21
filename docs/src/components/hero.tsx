import { content } from '@/lib/services/content.service';
import { packages } from '@/lib/services/packages.service';
import { FRAME } from '@/lib/constants/frame.const';
import { ShaftChecks } from '@/components/shaft-review-mock';

const BUTTON =
  'inline-flex h-10 items-center rounded-lg bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-transform hover:-translate-y-px';

/**
 * Names the maker, then two doors of equal weight: the libraries and Axon Shaft. Each door has one
 * action and a small drawing of the real thing, the published versions or the check runs.
 */
export function Hero() {
  const { hero } = content;
  const [libraries, shaft] = hero.doors;
  const external = (href: string) => /^https?:/.test(href) && { target: '_blank', rel: 'noreferrer noopener' };

  const doors = [
    {
      door: libraries,
      body: libraries.body.replace('{count}', String(packages.length)),
      visual: (
        <ul className={`${FRAME} divide-y bg-fd-background font-mono text-[0.75rem] sm:text-[0.8125rem]`}>
          {packages.map((pkg) => (
            <li key={pkg.name} className="flex items-baseline gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 truncate">{pkg.name}</span>
              <span className="shrink-0 text-fd-muted-foreground">v{pkg.version}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      door: shaft,
      body: shaft.body,
      visual: <ShaftChecks only={['review', 'security', 'tests', 'gates']} />,
    },
  ];

  return (
    <header className="hero-shade px-5 pt-14 pb-16 sm:pt-20 sm:pb-20">
      <div className="mx-auto max-w-3xl text-center">
        <a
          href={hero.pill.href}
          className="rise inline-flex max-w-full items-center gap-2 rounded-full border bg-fd-card py-1 ps-1 pe-3 text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
        >
          <span className="shrink-0 rounded-full bg-fd-primary px-2 py-0.5 text-xs font-medium text-fd-primary-foreground">
            {hero.pill.badge}
          </span>
          <span className="min-w-0 text-start">{hero.pill.text}</span>
        </a>
        <h1 className="rise mt-8 text-[clamp(2.25rem,1.2rem+3.4vw,3.5rem)] leading-[1.08] font-semibold tracking-[-0.035em] text-balance [animation-delay:80ms]">
          {hero.title}
        </h1>
        <p className="rise mt-4 text-fd-muted-foreground [animation-delay:160ms]">{hero.lead}</p>
      </div>

      <div className="rise mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2 [animation-delay:240ms]">
        {doors.map(({ door, body, visual }) => (
          <section key={door.title} aria-label={door.title} className="flex min-w-0 flex-col rounded-xl border bg-fd-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold tracking-tight">{door.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground text-pretty">{body}</p>
            <div aria-hidden="true" className="mt-5 flex-1 text-sm select-none">
              {visual}
            </div>
            <p className="mt-6">
              <a href={door.action.href} {...external(door.action.href)} className={BUTTON}>
                {door.action.label}
              </a>
            </p>
          </section>
        ))}
      </div>
    </header>
  );
}
