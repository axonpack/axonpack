import { Provider } from '@/components/provider';
import { SiteFooter } from '@/components/site-footer';
import './global.css';
import type { Metadata } from 'next';
import { Chakra_Petch, JetBrains_Mono } from 'next/font/google';
import { appLongName, appName, appTagline, siteUrl } from '@/lib/shared';

// Chakra Petch has no variable cut, so every weight the site uses has to be asked for by name.
const sans = Chakra_Petch({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
// Variable, so one file covers the medium/semibold/bold the panel mockup and badges ask for.
// It feeds Tailwind's `--font-mono` in global.css, which is what fumadocs' code blocks and
// every `font-mono` on the site read.
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-family' });

export const metadata: Metadata = {
  // Every absolute URL in the metadata (OG and Twitter images, canonicals) is resolved against
  // this. It has to be the deployed origin, not localhost, or a shared link previews nothing.
  // The override is for a preview deploy on some other origin.
  metadataBase: new URL(siteUrl),
  // Long name when the site names itself, short as a suffix on a page that already has a title.
  title: { default: appLongName, template: `%s — ${appName}` },
  description: appTagline,
  icons: { icon: '/logo.png' },
  // Inherited by every page, so a page only states what differs. `openGraph.title` is left out on
  // purpose: Next fills it from the page's own resolved title, and naming it here would freeze the
  // site name onto every card.
  openGraph: { type: 'website', siteName: appLongName, locale: 'en_US' },
  // Without this a card unfurls as the small square thumbnail, which crops the 1200x630 image to
  // an unreadable centre strip.
  twitter: { card: 'summary_large_image' },
  // Search Console's HTML-tag method. It is checked on every crawl, not just once, so it stays.
  // The token names the property, not an account, and is public by design.
  verification: { google: 'HRVTfO1xhpOrOcjio3f8YBlouYqzWwdSUlB-ESLo-bo' },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${sans.className} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>
          {children}
          <SiteFooter />
        </Provider>
      </body>
    </html>
  );
}
