import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';
import { useState } from 'react';

import { formatDuration } from '../../../core/utils/format-duration.util';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import { navigateTo } from '../../../features/navigation/services/attach-navigation.service';
import type { NavigationMove } from '../../../features/navigation/stores/navigation.store';
import {
  formatActionLabel,
  formatClockTime,
  formatMoveTitle,
  formatRouteName,
} from '../../../features/navigation/utils/format-navigation.util';
import { InitiatorTab } from '../network-panel/request-detail/initiator-tab.component';
import { JsonTree } from '../network-panel/request-detail/json-tree.component';

/**
 * The app's move sheet as a side pane: what happened, the params, the payload, the state after the
 * move and where it was dispatched from. Go again runs the real navigator on the move's own
 * container, as the sheet's button does.
 */
export function MoveDetail({
  move,
  stayed,
  onClose,
}: {
  move: NavigationMove;
  stayed: number | null;
  onClose: () => void;
}) {
  // Keyed by the move it answers, so opening another row does not carry an old refusal over.
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const title = formatMoveTitle(move);
  const to = move.to;

  const rows: [string, string][] = [
    ['Time', formatClockTime(move.timestamp)],
    ['Container', move.container],
    ['Action', formatActionLabel(move.action)],
    ['From', formatRouteName(move.from)],
    ['To', formatRouteName(to)],
    ...(to?.path ? ([['Path', to.path]] as [string, string][]) : []),
    ['On screen', move.noop ? 'no change' : stayed === null ? 'still' : formatDuration(stayed)],
  ];

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
        <span className="axonpack-net-detail-title">{title}</span>
        <span className="axonpack-net-spacer" />
        {to && (
          <button
            className="axonpack-nav-text-button"
            title={`Navigate ${move.container} to ${to.name} with the same params`}
            onClick={() => {
              const message = navigateTo(to.name, to.params, move.container);
              setError(message === null ? null : { id: move.id, message });
            }}>
            Go here again
          </button>
        )}
        <button
          className="axonpack-net-button"
          data-icon="copy"
          title="Copy as JSON"
          {...{ [COPY_ATTRIBUTE]: JSON.stringify(move, null, 2) }}
        />
      </div>
      <div className="axonpack-net-detail-body">
        {error?.id === move.id && <p className="axonpack-nav-error">{error.message}</p>}
        <details open className="axonpack-net-section">
          <summary>Move</summary>
          <div className="axonpack-net-kv">
            {rows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </details>
        {to?.params && Object.keys(to.params).length > 0 && (
          <details open className="axonpack-net-section">
            <summary>Params</summary>
            <JsonTree value={to.params as unknown as JsonValue} />
          </details>
        )}
        {move.payload && Object.keys(move.payload).length > 0 && (
          <details className="axonpack-net-section">
            <summary>Action payload</summary>
            <JsonTree value={move.payload as unknown as JsonValue} />
          </details>
        )}
        {move.state && (
          <details open className="axonpack-net-section">
            <summary>State after</summary>
            <JsonTree value={move.state as unknown as JsonValue} defaultExpanded={false} />
          </details>
        )}
        <details open className="axonpack-net-section">
          <summary>Dispatched from</summary>
          {move.origin?.length ? (
            <InitiatorTab key={move.id} id={move.id} frames={move.origin} title="Call stack" />
          ) : (
            <p className="axonpack-net-none">
              No call stack was captured. React Navigation attaches one in a development build.
            </p>
          )}
        </details>
      </div>
    </div>
  );
}
