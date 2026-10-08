import { useState } from 'react';

import {
  navigateTo,
  openLink,
} from '../../../features/navigation/services/attach-navigation.service';
import {
  navigationStore,
  useNavigationStore,
  type NavigationMove,
} from '../../../features/navigation/stores/navigation.store';
import {
  collectRouteNames,
  lastParamsFor,
} from '../../../features/navigation/utils/collect-route-names.util';
import {
  hostedContainers,
  resolveOnScreen,
} from '../../../features/navigation/utils/flatten-navigator.util';
import { parseParams } from '../../../features/navigation/utils/parse-params.util';
import { SyncedInput } from '../network-panel/synced-input.component';

/**
 * The app's Open a screen sheet, in the pane: a route by name with params, or a deep link. Both run
 * on the phone, through the same service as the sheet, so the app sees the move as its own and is
 * free to refuse it. Mounted each time it opens, which is what starts it on the container on screen.
 */
export function NavigatePane({ moves, onClose }: { moves: NavigationMove[]; onClose: () => void }) {
  const containers = useNavigationStore(navigationStore.getContainers);
  const latest = useNavigationStore(navigationStore.getFocusedContainer);
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [paramsText, setParamsText] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const names = containers.map((container) => container.name);
  const onScreen = latest ? resolveOnScreen(latest, hostedContainers(containers)).name : null;
  const container = picked !== null && names.includes(picked) ? picked : onScreen;
  const own = moves.filter((move) => move.container === container);
  const state = containers.find((current) => current.name === container)?.state ?? null;

  const parsed = parseParams(paramsText);
  const typed = name.trim().toLowerCase();
  const matching = collectRouteNames(state, own).filter((route) =>
    route.toLowerCase().includes(typed)
  );

  function pick(route: string) {
    setName(route);
    setError(null);
    // Only into an empty field: what was typed on purpose is not overwritten by a guess.
    const params = lastParamsFor(route, own);
    if (paramsText.trim().length === 0 && params && Object.keys(params).length > 0) {
      setParamsText(JSON.stringify(params, null, 2));
    }
  }

  function submitNavigate() {
    if (parsed.error) return setError(parsed.error);
    const message = navigateTo(name.trim(), parsed.params, container);
    if (message === null) onClose();
    else setError(message);
  }

  async function submitLink() {
    const message = await openLink(url.trim());
    if (message === null) onClose();
    else setError(message);
  }

  return (
    <div className="axonpack-net-detail">
      <div className="axonpack-net-detail-bar">
        <button
          className="axonpack-net-button axonpack-net-detail-close"
          data-icon="cross"
          title="Close"
          aria-label="Close"
          onClick={onClose}
        />
        <span className="axonpack-net-detail-title">Open a screen or a link</span>
      </div>
      <div className="axonpack-net-detail-body">
        <div className="axonpack-net-editor">
          {names.length > 1 && (
            <div className="axonpack-nav-choices" role="group" aria-label="Container">
              <span className="axonpack-nav-label">Container</span>
              {names.map((current) => (
                <button
                  key={current}
                  className="axonpack-net-type"
                  aria-pressed={current === container}
                  onClick={() => {
                    setPicked(current);
                    setError(null);
                  }}>
                  {current}
                </button>
              ))}
            </div>
          )}
          <label className="axonpack-net-field">
            Route name
            <SyncedInput value={name} onChange={setName} placeholder="Details" label="Route name" />
          </label>
          {matching.length > 0 && (
            <div className="axonpack-nav-choices" role="group" aria-label="Routes">
              {matching.map((route) => (
                <button
                  key={route}
                  className="axonpack-net-type"
                  aria-pressed={route === name.trim()}
                  onClick={() => pick(route)}>
                  {route}
                </button>
              ))}
            </div>
          )}
          <span className="axonpack-nav-label">Params (JSON)</span>
          <SyncedInput
            value={paramsText}
            onChange={setParamsText}
            placeholder='{ "id": 42 }'
            label="Params"
            multiline
          />
          <div className="axonpack-net-editor-actions">
            <button
              className="axonpack-net-action"
              data-tone="accent"
              disabled={name.trim().length === 0 || parsed.error !== undefined}
              onClick={submitNavigate}>
              Open screen
            </button>
          </div>

          <label className="axonpack-net-field">
            Deep link
            <SyncedInput
              value={url}
              onChange={setUrl}
              placeholder="myapp://details/42"
              label="Deep link"
            />
          </label>
          <div className="axonpack-net-editor-actions">
            <button
              className="axonpack-net-action"
              data-tone="accent"
              disabled={url.trim().length === 0}
              onClick={submitLink}>
              Open link
            </button>
          </div>

          {(error ?? parsed.error) && <p className="axonpack-nav-error">{error ?? parsed.error}</p>}
        </div>
      </div>
    </div>
  );
}
