/**
 * The one list of what Axonpack ships. Adding a library means adding an entry here and a
 * `content/docs/<slug>/` folder — nothing else on the site enumerates packages by hand.
 */
export type PackageStatus = 'shipped' | 'planned';

export type AxonpackPackage = {
  /** npm name, and the tab title in the docs sidebar. */
  name: string;
  /**
   * The package's own segment, used identically in three places so they never drift:
   * `content/docs/<slug>/`, the `/docs/<slug>` route, and `public/<slug>/` for its assets.
   */
  slug: string;
  status: PackageStatus;
  summary: string;
};

export const packages: AxonpackPackage[] = [
  {
    name: '@axonpack/expo-devtools',
    slug: 'expo-devtools',
    status: 'shipped',
    summary:
      'Browser-style devtools that live inside your app: network, console, performance, storage, crashes and a debug tab, behind a draggable button.',
  },
  {
    name: '@axonpack/lite-storage',
    slug: 'lite-storage',
    status: 'planned',
    summary:
      'Local storage on SQLite with in-memory caching, one AsyncStorage-shaped interface, and debounced batched writes.',
  },
  {
    name: '@axonpack/api-kit',
    slug: 'api-kit',
    status: 'planned',
    summary:
      'An HTTP client factory with auth built in: single-flight 401 refresh and retry, and a token service that caches in sync and persists on a debounce.',
  },
  {
    name: '@axonpack/i18n',
    slug: 'i18n',
    status: 'planned',
    summary: 'Type-safe translations without a configuration file to maintain.',
  },
];

export const shippedPackages = packages.filter((pkg) => pkg.status === 'shipped');

/** A planned package has no docs folder yet, so it points at the roadmap instead. */
export function packageHref(pkg: AxonpackPackage): string {
  return pkg.status === 'shipped' ? `/docs/${pkg.slug}` : '/docs/overview/roadmap';
}

export function packageAsset(pkg: Pick<AxonpackPackage, 'slug'>, path: string): string {
  return `/${pkg.slug}/${path.replace(/^\//, '')}`;
}

export const npmUrl = (name: string) => `https://www.npmjs.com/package/${name}`;

/**
 * Search is filtered by the root folder a page sits in, which is the same thing as its tab and the
 * same string as its slug. `overview` is in the list because it is a tab like any other, even though
 * it is the one that is not a package.
 */
export const OVERVIEW_TAG = 'overview';

export const searchTags: { value: string; label: string }[] = [
  { value: OVERVIEW_TAG, label: 'Axonpack' },
  ...shippedPackages.map((pkg) => ({ value: pkg.slug, label: pkg.slug })),
];
