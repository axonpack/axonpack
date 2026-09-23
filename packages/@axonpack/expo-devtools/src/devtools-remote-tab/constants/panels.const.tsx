import type { ComponentType } from 'react';

import { NetworkPanel } from '../components/network-panel';
import { PlaceholderPanel } from '../components/placeholder-panel.component';

export type AxonpackPanel = {
  id: string;
  title: string;
  component: ComponentType;
  /** Ours rather than a plugin's. Drawn with a tint on its top half, so the two can be told apart. */
  builtIn?: boolean;
};

// Same tabs, same order as the in-app panel's `devtools-tab-bar.component.tsx`.
const BUILT_IN: AxonpackPanel[] = [
  { id: 'network', title: 'Network', component: NetworkPanel },
  { id: 'console', title: 'Console', component: () => <PlaceholderPanel title="Console" /> },
  {
    id: 'performance',
    title: 'Performance',
    component: () => <PlaceholderPanel title="Performance" />,
  },
  { id: 'storage', title: 'Storage', component: () => <PlaceholderPanel title="Storage" /> },
  { id: 'crashes', title: 'Crashes', component: () => <PlaceholderPanel title="Crashes" /> },
  { id: 'debug', title: 'Debug', component: () => <PlaceholderPanel title="Debug" /> },
];

export const PANELS: AxonpackPanel[] = BUILT_IN.map((panel) => ({ ...panel, builtIn: true }));
