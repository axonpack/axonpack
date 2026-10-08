import { NAVIGATION_SETUP_SNIPPET } from '../../../features/navigation/constants/setup-snippet.const';
import {
  navigationStore,
  useNavigationStore,
} from '../../../features/navigation/stores/navigation.store';

/** The app's waiting tab: which router was found, and for React Navigation how to finish wiring it. */
export function NavigationWaitingState() {
  const kind = useNavigationStore(navigationStore.getRouterKind);

  if (kind === 'expo-router') {
    return (
      <div className="axonpack-net-editor">
        <strong>Waiting for Expo Router</strong>
        <p className="axonpack-net-none">
          Expo Router is installed, and its navigator is picked up on its own once the router's root
          has mounted. If this stays, Expo Router is not what this app navigates with.
        </p>
      </div>
    );
  }

  return (
    <div className="axonpack-net-editor">
      <strong>Waiting for a navigation container</strong>
      <p className="axonpack-net-none">
        React Navigation is installed. A container is found on its own when the provider sits inside
        it. With the provider above the container, hand the container's ref over with one hook.
      </p>
      <pre className="axonpack-net-code">{NAVIGATION_SETUP_SNIPPET}</pre>
    </div>
  );
}
