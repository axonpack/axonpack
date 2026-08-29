import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { npmUrl, packageAsset, packageHref, packages, shippedPackages } from '@/lib/packages';
import { appName, appTagline, gitConfig } from '@/lib/shared';

export const metadata: Metadata = {
  title: `${appName} — foundation libraries for React Native and Expo`,
  description: appTagline,
};

// The hero shots belong to one package, so they are named against it rather than pulled from a
// site-wide list — the same split as `content/docs/<slug>/` and `public/<slug>/`.
const devtools = { slug: 'expo-devtools' } as const;

const shots = [
  {
    src: packageAsset(devtools, 'screenshots/network-log.png'),
    alt: 'Network tab listing captured requests',
    caption: 'Every request as it happens, in-app browser traffic included.',
  },
  {
    src: packageAsset(devtools, 'screenshots/console-log.png'),
    alt: 'Console tab listing captured logs',
    caption: 'Every log, with objects you can open up and explore.',
  },
  {
    src: packageAsset(devtools, 'screenshots/perf-statistics.png'),
    alt: 'Performance tab showing frame rate and memory charts',
    caption: 'Frame rate, memory and startup, measured on the device.',
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-16 pb-12 text-center sm:pt-24">
        <Image src="/logo.png" alt="" width={72} height={72} className="rounded-xl" priority />
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{appName}</h1>
        <p className="mt-4 max-w-2xl text-lg text-fd-muted-foreground">
          {appTagline} Small, focused, dependency-light packages you drop in rather than a framework
          you adopt. Each one installs, versions and documents on its own.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs/overview"
            className="rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
          {shippedPackages.map((pkg) => (
            <Link
              key={pkg.slug}
              href={packageHref(pkg)}
              className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
            >
              {pkg.name}
            </Link>
          ))}
          <a
            href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
            className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
          >
            GitHub
          </a>
        </div>

        <code className="mt-8 rounded-lg border bg-fd-card px-4 py-2.5 font-mono text-sm">
          npx expo install @axonpack/expo-devtools
        </code>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {shots.map((shot) => (
            <figure key={shot.src} className="flex flex-col gap-3">
              <Image
                src={shot.src}
                alt={shot.alt}
                width={520}
                height={1120}
                className="rounded-xl border bg-fd-card"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <figcaption className="text-sm text-fd-muted-foreground">{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-24">
        <h2 className="text-2xl font-semibold tracking-tight">Packages</h2>
        <p className="mt-2 text-fd-muted-foreground">
          Each package is published independently, and documented under its own name. Only{' '}
          <code>@axonpack/expo-devtools</code> exists today; the rest are listed because the roadmap
          is public, not because they are installable.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <Link
              key={pkg.slug}
              href={packageHref(pkg)}
              className="flex flex-col rounded-xl border bg-fd-card p-5 transition-colors hover:bg-fd-accent"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-medium">{pkg.name}</span>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-fd-muted-foreground">
                  {pkg.status === 'shipped' ? 'Shipped' : 'Planned'}
                </span>
              </div>
              <p className="mt-3 text-sm text-fd-muted-foreground">{pkg.summary}</p>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm text-fd-muted-foreground">
          MIT licensed.{' '}
          <a className="underline" href={npmUrl('@axonpack/expo-devtools')}>
            @axonpack/expo-devtools on npm
          </a>
          .
        </p>
      </section>
    </main>
  );
}
