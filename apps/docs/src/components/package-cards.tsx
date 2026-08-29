import { Card, Cards } from 'fumadocs-ui/components/card';
import { packageHref, packages, type PackageStatus } from '@/lib/packages';

/**
 * Rendered from `packages.ts` rather than written out in MDX, so a new library appears on every
 * page that lists them without anyone remembering to edit a second list.
 */
export function PackageCards({ status }: { status?: PackageStatus }) {
  const shown = status ? packages.filter((pkg) => pkg.status === status) : packages;

  return (
    <Cards>
      {shown.map((pkg) => (
        <Card
          key={pkg.slug}
          title={pkg.status === 'shipped' ? pkg.name : `${pkg.name} — planned`}
          href={packageHref(pkg)}
          description={pkg.summary}
        />
      ))}
    </Cards>
  );
}
