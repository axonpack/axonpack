import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

// The blog pages were bare mains with no header at all. They take fumadocs' own navbar, built from
// the same `baseOptions` every layout gets, so the links match without sharing the landing header.
export default function Layout({ children }: LayoutProps<'/blog'>) {
  return (
    <HomeLayout {...baseOptions()}>
      {children}
    </HomeLayout>
  );
}
