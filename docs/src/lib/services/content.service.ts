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
  brand: { name: string; logo: string; logoDark: string; url: string };
  nav: { links: NavLink[]; github: { href: string; repo: string; label: string } };
  hero: {
    title: string;
    titleAccent: string;
    lead: string;
    /** The AI path to a first install, under the buttons. The manual one is a link from it. */
    start: { command: string; ask: string; prompt: string; note: string; links: Link[] };
    actions: Link[];
    terminal: { label: string; command: string; output: string[] };
    panelLabel: string;
  };
  agent: {
    title: string;
    scene: string;
    answer: string;
    steps: { command: string; text: string }[];
    usage: { title: string; body: string; label: string };
    skills: { title: string; body: string; command: string };
    links: Link[];
  };
  /** Keyed by package slug. A published package with no story still gets its npm description. */
  libraries: {
    title: string;
    body: string;
    stories: Record<string, Story>;
  };
  principles: { title: string; body: string; items: { title: string; body: string; link: Link }[] };
  footer: { blurb: string; columns: { title: string; links: Link[] }[]; legal: string };
};

export const content = raw as unknown as Content;

export const navLink = (label: string) => content.nav.links.find((link) => link.label === label);
