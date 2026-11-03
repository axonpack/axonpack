import { useMemo } from 'react';

import {
  navigationStore,
  useNavigationStore,
} from '../../features/navigation/stores/navigation.store';
import { previewStore, usePreviewStore } from '../../features/preview/stores/preview.store';
import { PANELS, type AxonpackPanel } from '../constants/panels.const';

/** The panels to offer. One given `false` is left out: the app has nothing it could ever show there. */
export function shownPanels(available: Record<string, boolean>): AxonpackPanel[] {
  return PANELS.filter((panel) => available[panel.id] !== false);
}

/**
 * The panels to offer, as the app's tab bar offers them: Navigation only once the device found a
 * router, and Preview only once `config.preview` set preview up.
 */
export function useShownPanels(): AxonpackPanel[] {
  const routerFound = useNavigationStore(navigationStore.getRouterKind) !== null;
  const previewSetUp = usePreviewStore(previewStore.isSetUp);
  return useMemo(
    () => shownPanels({ navigation: routerFound, preview: previewSetUp }),
    [routerFound, previewSetUp]
  );
}
