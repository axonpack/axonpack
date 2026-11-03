import { useState } from 'react';

import { QueryDetail } from './query-detail.component';
import { formatDuration } from '../../../core/utils/format-duration.util';
import { aiUsageStore, useAiUsageStore } from '../../../features/ai-usage/stores/ai-usage.store';
import {
  formatClockTime,
  formatMatched,
} from '../../../features/ai-usage/utils/format-ai-usage.util';
import { NETWORK_PANEL_CSS } from '../../constants/network-panel-css.const';
import { SplitResizer } from '../network-panel/split-resizer.component';

/** The list's width beside an open reply, and the least a drag leaves it. */
const LIST_WIDTH = 420;
const LIST_MIN = 200;

/**
 * The app's AI Usage tab over the same store, so recording and clearing move together on both
 * sides. Every row is drawn, with no windowing: the store keeps 100 queries at most.
 */
export function AiUsagePanel() {
  const entries = useAiUsageStore(aiUsageStore.getSnapshot);
  const recording = !useAiUsageStore(aiUsageStore.isPaused);
  // The id, not the entry: cleared or pushed out of the 100 closes the pane with it.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listWidth, setListWidth] = useState(LIST_WIDTH);
  const [resizing, setResizing] = useState(false);
  const selected = entries.find((entry) => entry.id === selectedId);

  return (
    <div className="axonpack-net">
      <style>{NETWORK_PANEL_CSS}</style>
      <div className="axonpack-net-bar" role="toolbar" aria-label="AI Usage">
        <button
          className="axonpack-net-button"
          data-icon={recording ? 'record-stop' : 'record-start'}
          data-red={recording || undefined}
          aria-pressed={recording}
          title={recording ? 'Stop recording queries' : 'Record queries'}
          onClick={() => aiUsageStore.setPaused(recording)}
        />
        <button
          className="axonpack-net-button"
          data-icon="clear"
          title="Clear queries"
          onClick={aiUsageStore.clear}
        />
        <span className="axonpack-net-spacer" />
        <span className="axonpack-net-count" style={{ marginRight: 6 }}>
          {entries.length}
        </span>
      </div>
      <div className="axonpack-net-main">
        <div
          className="axonpack-net-body"
          style={
            selected
              ? {
                  flex: 'none',
                  width: `max(${LIST_MIN}px, calc(${listWidth}px + var(--net-split-drag, 0px)))`,
                }
              : undefined
          }>
          {entries.length === 0 ? (
            <div className="axonpack-net-editor">
              <strong>No agent queries yet</strong>
              <p className="axonpack-net-none">
                An AI agent, or you, can read this app's devtools from a terminal, mock a request or
                send one. Each query and action shows up here with the reply it got. Start in the
                app's project folder:
              </p>
              <pre className="axonpack-net-code">npx devtools topics</pre>
            </div>
          ) : (
            <div
              className="axonpack-net-grid"
              style={{ gridTemplateColumns: '70px minmax(160px, 1fr) 80px 70px' }}>
              <div className="axonpack-net-row axonpack-net-head">
                <span>Time</span>
                <span>Command</span>
                <span>Matched</span>
                <span>Took</span>
              </div>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="axonpack-net-row"
                  data-selected={entry.id === selectedId || undefined}
                  data-failed={entry.error !== undefined || undefined}
                  onClick={() => setSelectedId(entry.id)}>
                  <span>{formatClockTime(entry.timestamp)}</span>
                  <span title={entry.error ?? entry.command}>{entry.command}</span>
                  <span>{formatMatched(entry)}</span>
                  <span>{formatDuration(entry.duration)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <>
            <SplitResizer
              width={listWidth}
              dragging={resizing}
              onStart={() => setResizing(true)}
              onEnd={(delta) => {
                if (delta !== undefined) setListWidth((width) => Math.max(LIST_MIN, width + delta));
                setResizing(false);
              }}
            />
            <QueryDetail entry={selected} onClose={() => setSelectedId(null)} />
          </>
        )}
      </div>
    </div>
  );
}
