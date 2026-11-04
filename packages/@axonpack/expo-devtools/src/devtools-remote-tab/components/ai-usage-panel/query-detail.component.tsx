import { COPY_ATTRIBUTE } from '@axonpack/react-native-devtools-tab';
import { useMemo } from 'react';

import type { AiUsageEntry } from '../../../features/ai-usage/stores/ai-usage.store';
import { parseReply, queryInfo } from '../../../features/ai-usage/utils/format-ai-usage.util';
import { JsonTree } from '../network-panel/request-detail/json-tree.component';

/** The app's query sheet as a side pane: what was asked, and the reply exactly as the agent got it. */
export function QueryDetail({ entry, onClose }: { entry: AiUsageEntry; onClose: () => void }) {
  const parsed = useMemo(
    () => (entry.reply === undefined ? undefined : parseReply(entry.reply)),
    [entry]
  );
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
        <span
          className="axonpack-net-detail-title"
          title={entry.command}
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
          {entry.command}
        </span>
        <span className="axonpack-net-spacer" />
        {entry.reply !== undefined && (
          <button
            className="axonpack-net-button"
            data-icon="copy"
            title="Copy the reply"
            {...{ [COPY_ATTRIBUTE]: entry.reply }}
          />
        )}
      </div>
      <div className="axonpack-net-detail-body">
        <details open className="axonpack-net-section">
          <summary>Query</summary>
          <div className="axonpack-net-kv">
            {queryInfo(entry).map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </details>
        <details open className="axonpack-net-section">
          <summary>Reply</summary>
          {entry.reply === undefined ? (
            <p className="axonpack-net-none">
              Not kept for a query of CLI, since it would repeat every earlier reply.
            </p>
          ) : parsed !== undefined ? (
            <JsonTree value={parsed} />
          ) : (
            <pre className="axonpack-net-code">{entry.reply || '(empty)'}</pre>
          )}
        </details>
      </div>
    </div>
  );
}
