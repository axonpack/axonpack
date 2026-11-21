import raw from "@/content.json";

// content.json is prose only. Packages come from npm. Typed here rather than at each use site,
// because TS collapses a heterogeneous JSON array into one type with optional members, so an
// `"menu" in link` check narrows nothing.

export type Link = { label: string; href: string };
export type NavGroup = { title: string; items: Link[] };
export type NavLink = { label: string; href?: string; external?: boolean; menu?: NavGroup[] };
export type Story = {
  scene: string;
  fix: string;
  sample: { lang: string; title: string; code: string };
};

export type Content = {
  brand: { name: string; logoDark: string; url: string };
  nav: { links: NavLink[]; github: { href: string; repo: string; label: string } };
  hero: {
    /** The one-line announcement above the headline. */
    pill: { badge: string; text: string; href: string };
    title: string;
    lead: string;
    /** The page's meta description. */
    description: string;
    /** Libraries, then Axon Shaft. `{count}` in a body is the number of published packages. */
    doors: { title: string; body: string; action: Link }[];
  };
  agent: {
    title: string;
    terminal: { label: string; command: string; output: string[] };
    panelLabel: string;
    scene: string;
    answer: string;
    steps: { command: string; text: string }[];
    usage: { title: string; body: string; label: string };
    skills: { title: string; body: string; command: string; ask: string; prompt: string; note: string };
    links: Link[];
  };
  /** Keyed by package slug. A published package with no story still gets its npm description. */
  libraries: {
    title: string;
    body: string;
    /** One line per package for the index, keyed by slug. A package without one shows its npm description. */
    lines: Record<string, string>;
    stories: Record<string, Story>;
  };
  /** Axon Shaft, the one product. Its docs live on its own site, so every action links out. */
  products: {
    id: string;
    name: string;
    /** One line, for the nav menu. */
    summary: string;
    title: string;
    body: string;
    points: { title: string; body: string }[];
    actions: Link[];
    mockLabel: string;
  };
  principles: { title: string; body: string; items: { title: string; body: string; link: Link }[] };
  footer: { blurb: string; columns: { title: string; links: Link[] }[]; legal: string };
};

export const content = raw as unknown as Content;

export const navLink = (label: string) => content.nav.links.find((link) => link.label === label);
