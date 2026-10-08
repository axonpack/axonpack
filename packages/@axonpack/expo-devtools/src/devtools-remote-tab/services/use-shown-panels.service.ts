import {
  navigationStore,
  useNavigationStore,
} from '../../features/navigation/stores/navigation.store';
import { PANELS, type AxonpackPanel } from '../constants/panels.const';

const WITHOUT_NAVIGATION = PANELS.filter((panel) => panel.id !== 'navigation');

/**
 * The panels to offer, as the app's tab bar offers them: Navigation only once the device found a
 * router, since an app with none has nothing it could ever show there.
 */
export function useShownPanels(): AxonpackPanel[] {
  const routerKind = useNavigationStore(navigationStore.getRouterKind);
  return routerKind === null ? WITHOUT_NAVIGATION : PANELS;
}
