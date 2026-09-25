import { createContext, useContext, useEffect } from 'react';

import {
  attachNavigationRef,
  type NavigationContainerRefLike,
} from '../../features/navigation/services/attach-navigation.service';
import { getReactNavigationRouteContext } from '../../features/navigation/services/detect-router.service';
import { navigationStore, ROOT_CONTAINER } from '../../features/navigation/stores/navigation.store';

/** Read when React Navigation is not installed, so the hook below has a context either way. */
const NO_ROUTE = createContext<unknown>(undefined);

/**
 * Hands the Navigation tab a React Navigation container the provider cannot see: one mounted
 * inside the provider. Call it from the component that owns the container:
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
 * A provider mounted inside a container finds that container on its own, and so does an Expo
 * Router app; both call it `root`. `name` is what the tab files this container's moves under, and
 * is what tells two containers apart when an app has more than one, such as a checkout flow with a
 * container of its own: name it `'checkout'`. It defaults to `root`, for a provider above the one
 * container an app has.
 *
 * Called from a screen of another container, as a flow with a container of its own is, the hook
 * also learns which route it sits in, and the tab draws this container under that route. Inert
 * until the devtools are running, so the call is safe to leave in a release build.
 */
export function useDevtoolsNavigation(
  ref: NavigationContainerRefLike,
  name: string = ROOT_CONTAINER
): void {
  const hostRoute = useContext(getReactNavigationRouteContext() ?? NO_ROUTE) as
    { key?: string } | undefined;
  const hostRouteKey = hostRoute?.key;

  useEffect(() => {
    if (!navigationStore.isEnabled()) return;
    // The app has said which router it uses, which beats whatever the start found installed.
    navigationStore.setRouterKind('react-navigation');
    return attachNavigationRef(ref, name, 'hook', hostRouteKey);
  }, [ref, name, hostRouteKey]);
}
