import Link from 'next/link';
import { content } from '@/lib/services/content.service';
import { Prose } from '@/components/prose';

/** Each point carries a link to the page that backs it, so none of them has to be taken on trust. */
export function Principles() {
  const { principles } = content;

  return (
    <section aria-labelledby="principles-title" className="border-t px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="principles-title"
            className="text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] leading-tight font-semibold tracking-[-0.02em] text-balance"
          >
            {principles.title}
          </h2>
          <p className="mt-3 text-fd-muted-foreground text-pretty">{principles.body}</p>
        </div>
        <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {principles.items.map((item) => (
            <li key={item.title} className="border-t pt-5">
              <h3 className="font-semibold tracking-tight"><Prose text={item.title} /></h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fd-muted-foreground"><Prose text={item.body} /></p>
              <Link
                href={item.link.href}
                className="mt-3 inline-block text-sm font-medium text-fd-primary underline-offset-4 hover:underline"
              >
                {item.link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
