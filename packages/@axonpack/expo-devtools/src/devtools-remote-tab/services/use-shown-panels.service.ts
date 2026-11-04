import { createElement, useMemo } from 'react';

import { supportsStore, useSupportsStore } from '../../core/stores/supports.store';
import {
  navigationStore,
  useNavigationStore,
} from '../../features/navigation/stores/navigation.store';
import { SupportPanel } from '../components/support-panel.component';
import { PANELS, type AxonpackPanel } from '../constants/panels.const';

/**
 * The panels to offer. One given `false` is left out: the app has nothing it could ever show there.
 * The supports' panels go before Crashes, as in the app's tab bar.
 */
export function shownPanels(
  available: Record<string, boolean>,
  supports: AxonpackPanel[] = []
): AxonpackPanel[] {
  const panels = PANELS.filter((panel) => available[panel.id] !== false);
  panels.splice(
    panels.findIndex(({ id }) => id === 'crashes'),
    0,
    ...supports
  );
  return panels;
}

/**
 * The panels to offer, as the app's tab bar offers them: Navigation only once the device found a
 * router, and one per support.
 */
export function useShownPanels(): AxonpackPanel[] {
  const routerFound = useNavigationStore(navigationStore.getRouterKind) !== null;
  const supports = useSupportsStore(supportsStore.getSupports);
  // Built once per support list, so a panel's component keeps its identity and stays mounted.
  const supportPanels = useMemo(
    () =>
      supports.map((support) => ({
        id: support.id,
        title: support.title,
        icon: support.icon,
        builtIn: true,
        component: () => createElement(SupportPanel, { support }),
      })),
    [supports]
  );
  return useMemo(
    () => shownPanels({ navigation: routerFound }, supportPanels),
    [routerFound, supportPanels]
  );
}
