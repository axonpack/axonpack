import type { ComponentType } from 'react';

import type { MaterialIcon } from './material-icons.const';
import { NetworkPanel } from '../components/network-panel';
import { PlaceholderPanel } from '../components/placeholder-panel.component';

export type AxonpackPanel = {
  id: string;
  title: string;
  component: ComponentType;
  /** The in-app tab's icon. A plugin's panel has none. */
  icon?: MaterialIcon;
  /** Ours rather than a plugin's. Drawn with a tint on its top half, so the two can be told apart. */
  builtIn?: boolean;
};

// Same tabs, same order as the in-app panel's `devtools-tab-bar.component.tsx`.
const BUILT_IN: AxonpackPanel[] = [
  { id: 'network', title: 'Network', icon: 'swap-vert', component: NetworkPanel },
  {
    id: 'console',
    title: 'Console',
    icon: 'terminal',
    component: () => <PlaceholderPanel title="Console" />,
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: 'speed',
    component: () => <PlaceholderPanel title="Performance" />,
  },
  {
    id: 'storage',
    title: 'Storage',
    icon: 'storage',
    component: () => <PlaceholderPanel title="Storage" />,
  },
  {
    id: 'crashes',
    title: 'Crashes',
    icon: 'bug-report',
    component: () => <PlaceholderPanel title="Crashes" />,
  },
  {
    id: 'debug',
    title: 'Debug',
    icon: 'construction',
    component: () => <PlaceholderPanel title="Debug" />,
  },
];

export const PANELS: AxonpackPanel[] = BUILT_IN.map((panel) => ({ ...panel, builtIn: true }));
