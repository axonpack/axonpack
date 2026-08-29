import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { MDXComponents } from 'mdx/types';
import { PackageCards } from './package-cards';

// Anything an .mdx page uses without importing it has to be listed here — fumadocs' own defaults
// cover Card/Cards/Callout and the code block, and no more.
export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Tabs,
    Tab,
    Steps,
    Step,
    Accordions,
    Accordion,
    PackageCards,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
