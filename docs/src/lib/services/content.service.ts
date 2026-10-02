import raw from "@/content.json";

// content.json is prose only. Packages come from npm. Typed here rather than at each use site,
// because TS collapses a heterogeneous JSON array into one type with optional members, so an
// `"menu" in link` check narrows nothing.

export type Link = { label: string; href: string };
export type NavGroup = { title: string; items: Link[] };
export type NavLink = { label: string; href?: string; external?: boolean; menu?: NavGroup[] };

export type Content = {
  brand: { name: string; logo: string; logoDark: string; url: string };
  nav: { links: NavLink[]; github: { href: string; repo: string; label: string } };
  hero: {
    title: string;
    titleAccent: string;
    lead: string;
    install: string;
    actions: Link[];
  };
  principles: { title: string; body: string; items: { icon: string; title: string; body: string }[] };
  footer: { blurb: string; columns: { title: string; links: Link[] }[]; legal: string };
};

export const content = raw as unknown as Content;

export const navLink = (label: string) => content.nav.links.find((link) => link.label === label);
