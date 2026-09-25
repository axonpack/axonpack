import { createContext, useContext, useEffect } from 'react';

import {
  attachNavigationRef,
  type NavigationContainerLike,
} from '../services/attach-navigation.service';
import { getReactNavigationContainerContext } from '../services/detect-router.service';
import { navigationStore } from '../stores/navigation.store';

/** Read when React Navigation is not installed, so the hook below has a context either way. */
const NO_CONTAINER = createContext<unknown>(undefined);

/**
 * Finds a React Navigation container from below. The container puts itself into context for
 * everything it renders, so a provider mounted inside it reaches the container with no ref and no
 * hook, which is where an Expo Router layout already sits. A provider above the container reads
 * nothing here, and there the app hands the ref over with `useDevtoolsNavigation` instead.
 */
export function NavigationContextBridge() {
  const container = useContext(getReactNavigationContainerContext() ?? NO_CONTAINER) as
    NavigationContainerLike | undefined;

  useEffect(() => {
    if (!container || !navigationStore.isEnabled()) return;
    navigationStore.setRouterKind('react-navigation');
    return attachNavigationRef({ current: container }, 'context');
  }, [container]);

  return null;
}
