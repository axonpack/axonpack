import type { ComponentType } from 'react';

import type { MaterialIcon } from './material-icons.const';
import { ConsolePanel } from '../components/console-panel';
import { CrashesPanel } from '../components/crashes-panel';
import { DebugPanel } from '../components/debug-panel';
import { NetworkPanel } from '../components/network-panel';
import { ConsoleBadge, CrashesBadge } from '../components/panel-badges.component';
import { PerformancePanel } from '../components/performance-panel';
import { StoragePanel } from '../components/storage-panel';

export type AxonpackPanel = {
  id: string;
  title: string;
  component: ComponentType;
  /** The in-app tab's icon. A plugin's panel has none. */
  icon?: MaterialIcon;
  /** Ours rather than a plugin's. Drawn with a tint on its top half, so the two can be told apart. */
  builtIn?: boolean;
  /**
   * A count on the tab while another is open, as the app's tab bar has. A component, so each badge
   * subscribes to its own number and a log line re-renders only that badge.
   */
  Badge?: ComponentType;
};

// Same tabs, same order as the in-app panel's `devtools-tab-bar.component.tsx`.
const BUILT_IN: AxonpackPanel[] = [
  { id: 'network', title: 'Network', icon: 'swap-vert', component: NetworkPanel },
  {
    id: 'console',
    title: 'Console',
    icon: 'terminal',
    component: ConsolePanel,
    Badge: ConsoleBadge,
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: 'speed',
    component: PerformancePanel,
  },
  {
    id: 'storage',
    title: 'Storage',
    icon: 'storage',
    component: StoragePanel,
  },
  {
    id: 'crashes',
    title: 'Crashes',
    icon: 'bug-report',
    component: CrashesPanel,
    Badge: CrashesBadge,
  },
  {
    id: 'debug',
    title: 'Debug',
    icon: 'construction',
    component: DebugPanel,
  },
];

export const PANELS: AxonpackPanel[] = BUILT_IN.map((panel) => ({ ...panel, builtIn: true }));
