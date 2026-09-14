import { useSyncExternalStore } from 'react';

import { devtoolsReadyStore } from '../stores/devtools-ready.store';
import { panelVisibilityStore } from '../stores/panel-visibility.store';

export type DevtoolsPanelControls = {
  /** Whether the panel is open right now. */
  visible: boolean;
  /**
   * Whether the devtools are running at all — `false` in a build where `enabled` is off, which is
   * also when `show` does nothing. Branch your own trigger on it so a release build has no dead
   * button in it.
   */
  enabled: boolean;
  show(): void;
  hide(): void;
  toggle(): void;
};

/**
 * Opens and closes the panel from your own UI — a long-press on a header, a hidden gesture, a row in
 * a staff-only settings screen. The way in when `<DevtoolsProvider showFloatingButton={false} />`
 * has taken the launcher button away.
 *
 * ```tsx
 * const devtoolsPanel = useDevtoolsPanel();
 * if (!devtoolsPanel.enabled) return null;
 * return <Button title="Devtools" onPress={devtoolsPanel.toggle} />;
 * ```
 *
 * Call it anywhere inside `<DevtoolsProvider />`. It reads the same state the launcher button does,
 * so the two stay in step.
 */
export function useDevtoolsPanel(): DevtoolsPanelControls {
  const visible = useSyncExternalStore(panelVisibilityStore.subscribe, panelVisibilityStore.isOpen);
  const enabled = useSyncExternalStore(devtoolsReadyStore.subscribe, devtoolsReadyStore.isReady);

  return {
    visible,
    enabled,
    show: panelVisibilityStore.show,
    hide: panelVisibilityStore.hide,
    toggle: panelVisibilityStore.toggle,
  };
}
