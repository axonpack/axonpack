import { content } from '@/lib/services/content.service';
import { Prose } from '@/components/prose';
import { SectionHeading } from '@/components/section-heading';
import { ShaftReviewMock } from '@/components/shaft-review-mock';

/**
 * Axon Shaft is a product with its own site, not a package, so it gets its own band, straight after
 * the hero, rather than a row in the package list. Left-aligned and on the card colour so it reads as
 * its own thing beside the centred hero. Every action leaves axonpack.dev.
 */
export function Products() {
  const { products } = content;
  const [primary, secondary] = products.actions;

  return (
    <section
      id={products.id}
      aria-labelledby="products-title"
      className="scroll-mt-20 border-y bg-fd-card px-5 py-20 sm:py-28"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-16">
        <div className="min-w-0">
          <SectionHeading id="products-title" title={products.title} body={products.body} />

          <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {products.points.map((point) => (
              <li key={point.title} className="border-t pt-4">
                <h3 className="font-semibold tracking-tight"><Prose text={point.title} /></h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fd-muted-foreground"><Prose text={point.body} /></p>
              </li>
            ))}
          </ul>

          <p className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href={primary.href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-10 items-center rounded-lg bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-transform hover:-translate-y-px"
            >
              {primary.label}
            </a>
            <a
              href={secondary.href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
            >
              {secondary.label}
            </a>
          </p>
        </div>

        <div role="img" aria-label={products.mockLabel} className="min-w-0 lg:pt-2">
          <ShaftReviewMock />
        </div>
      </div>
    </section>
  );
}
