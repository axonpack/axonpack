import { useState } from 'react';

import { DEBUG_PANEL_CSS } from './debug-panel-css.const';
import { LIMITER_PRESETS_MS } from '../../../features/debug/constants/limiter.const';
import {
  blockThread,
  crashThread,
  isMainThreadLimiterAvailable,
} from '../../../features/debug/services/limiter.service';
import { limiterStore, useLimiterStore } from '../../../features/debug/stores/limiter.store';
import {
  blockNote,
  crashNote,
  formatPreset,
} from '../../../features/debug/utils/limiter-copy.util';
import { NETWORK_PANEL_CSS } from '../../constants/network-panel-css.const';
import { SyncedInput } from '../network-panel/synced-input.component';

/**
 * The app's Debug tab: the Limiter, over the same `limiterStore`, so the thread and duration picked
 * on either side show on both. Arming a crash is this surface's own, like the app's.
 */
export function DebugPanel() {
  const { target, durationMs, customText } = useLimiterStore();
  const [armed, setArmed] = useState(false);
  const mainThreadAvailable = isMainThreadLimiterAvailable();
  const targetAvailable = target === 'js' || mainThreadAvailable;

  function crash() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    // A click from here runs inside the message DevTools delivered, so a throw would go back to
    // DevTools instead of to React Native's error handler, and the Crashes tab would never hear of
    // it. From a timer it is uncaught, the same as a throw from the app's own button.
    if (target === 'js') setTimeout(() => crashThread('js'), 0);
    else crashThread('main');
  }

  return (
    <div className="axonpack-net axonpack-dbg">
      <style>{NETWORK_PANEL_CSS}</style>
      <style>{DEBUG_PANEL_CSS}</style>
      <div className="axonpack-dbg-body">
        <div className="axonpack-dbg-label">Thread</div>
        <div className="axonpack-dbg-row" role="group" aria-label="Thread">
          <button
            className="axonpack-net-type"
            aria-pressed={target === 'js'}
            onClick={() => limiterStore.setTarget('js')}>
            JavaScript
          </button>
          <button
            className="axonpack-net-type"
            aria-pressed={target === 'main'}
            onClick={() => limiterStore.setTarget('main')}>
            Main (UI)
          </button>
        </div>

        <div className="axonpack-dbg-label">For</div>
        <div className="axonpack-dbg-row" role="group" aria-label="Duration">
          {LIMITER_PRESETS_MS.map((preset) => (
            <button
              key={preset}
              className="axonpack-net-type"
              aria-pressed={durationMs === preset && customText.length === 0}
              onClick={() => limiterStore.choosePreset(preset)}>
              {formatPreset(preset)}
            </button>
          ))}
          <label className="axonpack-net-field">
            <SyncedInput
              value={customText}
              onChange={limiterStore.setCustomText}
              placeholder="Custom"
              label="Custom duration in milliseconds"
            />
            ms
          </label>
        </div>

        <div className="axonpack-dbg-actions">
          <button
            className="axonpack-net-action"
            data-tone="accent"
            disabled={!targetAvailable}
            onClick={() => blockThread(target, durationMs)}>
            {`Block for ${durationMs}ms`}
          </button>
          <button
            className="axonpack-net-action"
            data-tone="error"
            disabled={!targetAvailable}
            onClick={crash}>
            {armed ? 'Click again to crash' : 'Crash'}
          </button>
        </div>

        <p className="axonpack-dbg-note">{blockNote(target, mainThreadAvailable)}</p>
        {target === 'js' && (
          <p className="axonpack-dbg-note">
            This panel freezes for as long too: the app's JavaScript draws it, and a blocked thread
            draws nothing.
          </p>
        )}
        <p className="axonpack-dbg-note">{crashNote(target)}</p>
      </div>
    </div>
  );
}
