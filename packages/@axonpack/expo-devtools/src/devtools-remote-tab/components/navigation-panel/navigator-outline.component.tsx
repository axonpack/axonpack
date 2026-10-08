import { useState, type CSSProperties } from 'react';

import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import { containerColor } from '../../../features/navigation/constants/container-colors.const';
import { canGoBack, goBack } from '../../../features/navigation/services/attach-navigation.service';
import type {
  NavigationContainerInfo,
  NavigationState,
} from '../../../features/navigation/stores/navigation.store';
import {
  flattenNavigator,
  type OutlineRow,
} from '../../../features/navigation/utils/flatten-navigator.util';
import { formatParamLines } from '../../../features/navigation/utils/format-navigation.util';
import { JsonTree } from '../network-panel/request-detail/json-tree.component';

/** How far in each level of the tree sits. */
const INDENT = 16;

/**
 * The app's milestone track as an indented outline: a chip per container, a node per route, the
 * active path filled, the screen on top marked with Back beside it. A click on a route with params
 * opens them as a tree; on a route hosting a flow, it opens or closes that flow.
 */
export function NavigatorOutline({
  state,
  currentKey,
  hosted,
  container,
}: {
  state: NavigationState;
  currentKey: string | undefined;
  hosted: Map<string, NavigationContainerInfo>;
  container: string;
}) {
  const palette = useThemeStore(themeStore.getPalette);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toggled, setToggled] = useState<ReadonlyMap<string, { open: boolean; from: boolean }>>(
    () => new Map()
  );
  // A refusal is said beside the button, never with `Alert`, which would come up on the phone.
  const [backError, setBackError] = useState<string | null>(null);
  const rows = flattenNavigator(state, currentKey, hosted, 0, 'nav', [], container, true, toggled);

  function toggleHosted(row: OutlineRow) {
    setToggled((previous) =>
      new Map(previous).set(row.key, { open: !row.open, from: row.openByDefault ?? false })
    );
  }

  return (
    <div className="axonpack-nav-outline">
      {rows.map((row) => {
        const style = {
          paddingLeft: 8 + row.depth * INDENT,
          '--track': containerColor(row.container, palette),
        } as CSSProperties;

        if (row.kind !== 'route') {
          return (
            <div key={row.key} className="axonpack-nav-node" style={style}>
              <span className="axonpack-nav-chip">{row.label}</span>
            </div>
          );
        }

        const params = formatParamLines(row.params, 3);
        const open = expanded === row.key;
        const clickable = row.hosts !== undefined || params.length > 0;
        return (
          <div key={row.key}>
            <div
              className="axonpack-nav-node"
              style={style}
              data-active={row.active || undefined}
              data-on-screen={row.onScreen || undefined}>
              {/* The click is on this span, not the row: a click cannot be stopped from bubbling
                  once it has crossed to the app, so Back inside a clickable row would open it too. */}
              <span
                className="axonpack-nav-hit"
                data-clickable={clickable || undefined}
                onClick={() => {
                  if (row.hosts) return toggleHosted(row);
                  if (params.length > 0) setExpanded(open ? null : row.key);
                }}>
                <span className="axonpack-nav-dot" />
                <span className="axonpack-nav-name">{row.label}</span>
                {row.hosts && (
                  <span className="axonpack-nav-hosts">
                    {row.open ? '▾' : '▸'} {row.hosts}
                  </span>
                )}
                {row.onScreen && <span className="axonpack-nav-pill">on screen</span>}
                {params.length > 0 && (
                  <span className="axonpack-nav-params">{params.join('  ')}</span>
                )}
              </span>
              {row.onScreen && (
                <button
                  className="axonpack-net-action"
                  disabled={!canGoBack(row.container)}
                  title={`Go back in ${row.container}`}
                  onClick={() => setBackError(goBack(row.container))}>
                  Back
                </button>
              )}
              {row.onScreen && backError !== null && (
                <span className="axonpack-nav-error">{backError}</span>
              )}
            </div>
            {open && !row.hosts && row.params && (
              <div style={{ paddingLeft: 8 + (row.depth + 1) * INDENT }}>
                <JsonTree value={row.params as unknown as JsonValue} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
