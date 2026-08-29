import { Provider } from '@/components/provider';
import './global.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { appName, appTagline } from '@/lib/shared';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL once the site has a domain; without it Next resolves OG image URLs
  // against localhost and warns on every build.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: appName, template: `%s — ${appName}` },
  description: appTagline,
  icons: { icon: '/logo.png' },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
