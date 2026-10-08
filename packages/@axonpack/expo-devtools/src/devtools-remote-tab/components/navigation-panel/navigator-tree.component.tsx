import { useMemo } from 'react';

import { NavigatorOutline } from './navigator-outline.component';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import {
  navigationStore,
  useNavigationStore,
} from '../../../features/navigation/stores/navigation.store';
import {
  hostedContainers,
  resolveOnScreen,
  topContainers,
} from '../../../features/navigation/utils/flatten-navigator.util';
import { JsonTree } from '../network-panel/request-detail/json-tree.component';

/**
 * The route on screen with its path and params, then every container as one tree, as the app's
 * card draws it: a container started inside a screen of another hangs under that screen.
 */
export function NavigatorTree() {
  const containers = useNavigationStore(navigationStore.getContainers);
  const focused = useNavigationStore(navigationStore.getFocusedContainer);
  const hosted = useMemo(() => hostedContainers(containers), [containers]);
  const onScreen = focused ? resolveOnScreen(focused, hosted) : null;
  const route = onScreen?.route ?? null;
  const params = route?.params && Object.keys(route.params).length > 0 ? route.params : null;

  return (
    <>
      <details open className="axonpack-net-section">
        <summary>Current route</summary>
        {route && onScreen ? (
          <>
            <div className="axonpack-net-kv">
              <div>
                <span>Route</span>
                <span>{route.name}</span>
              </div>
              {route.path && (
                <div>
                  <span>Path</span>
                  <span>{route.path}</span>
                </div>
              )}
              {containers.length > 1 && (
                <div>
                  <span>Container</span>
                  <span>{onScreen.name}</span>
                </div>
              )}
              {!params && (
                <div>
                  <span>Params</span>
                  <span className="axonpack-nav-muted">none</span>
                </div>
              )}
            </div>
            {params && <JsonTree value={params as unknown as JsonValue} rootLabel="params" />}
          </>
        ) : (
          <p className="axonpack-net-none">No navigator has mounted yet.</p>
        )}
      </details>
      <details open className="axonpack-net-section">
        <summary>Navigator</summary>
        <div className="axonpack-nav-tree">
          {topContainers(containers).map((top) =>
            top.state ? (
              <NavigatorOutline
                key={top.name}
                state={top.state}
                currentKey={top.route?.key}
                hosted={hosted}
                container={top.name}
              />
            ) : (
              <p key={top.name} className="axonpack-net-none">
                {top.name}: no navigator mounted in it yet.
              </p>
            )
          )}
        </div>
      </details>
    </>
  );
}
