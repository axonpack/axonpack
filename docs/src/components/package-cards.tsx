import { Card, Cards } from 'fumadocs-ui/components/card';
import { documented } from '@/lib/services/packages.service';

/**
 * Rendered from the generated catalogue rather than a hand-written list, so publishing a library
 * puts it on every page that lists them with nothing to remember. `documented` rather than every
 * package: one on npm without pages yet would be a card linking at a 404.
 */
export function PackageCards() {
  return (
    <Cards>
      {documented.map((pkg) => (
        <Card key={pkg.slug} title={pkg.title} href={pkg.docsHref} description={pkg.description} />
      ))}
    </Cards>
  );
}
