import { useEffect } from 'react';

import {
  attachNavigationRef,
  type NavigationContainerRefLike,
} from '../../features/navigation/services/attach-navigation.service';
import { navigationStore } from '../../features/navigation/stores/navigation.store';

/**
 * Hands the Navigation tab your React Navigation container, from the component that owns it:
 *
 * ```tsx
 * const navigationRef = createNavigationContainerRef();
 *
 * function App() {
 *   useDevtoolsNavigation(navigationRef);
 *   return <NavigationContainer ref={navigationRef}>...</NavigationContainer>;
 * }
 * ```
 *
 * An Expo Router app does not need this: its container is found on its own. React Navigation keeps
 * no record of where a container was mounted, so this one line is what a provider above the
 * container cannot do for itself. Inert until the devtools are running, so the call is safe to
 * leave in a release build.
 */
export function useDevtoolsNavigation(ref: NavigationContainerRefLike): void {
  useEffect(() => {
    if (!navigationStore.isEnabled()) return;
    // The app has said which router it uses, which beats whatever the start found installed.
    navigationStore.setRouterKind('react-navigation');
    return attachNavigationRef(ref, 'hook');
  }, [ref]);
}
