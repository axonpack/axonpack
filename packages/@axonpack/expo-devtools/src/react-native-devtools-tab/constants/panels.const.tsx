import type { ComponentType } from 'react';

import { PlaceholderPanel } from '../components/placeholder-panel.component';

export type AxonpackPanel = {
  id: string;
  title: string;
  component: ComponentType;
};

// Same tabs, same order as the in-app panel's `devtools-tab-bar.component.tsx`.
export const PANELS: AxonpackPanel[] = [
  { id: 'network', title: 'Network', component: () => <PlaceholderPanel title="Network" /> },
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
