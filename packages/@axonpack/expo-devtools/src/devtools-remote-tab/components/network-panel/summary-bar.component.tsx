import { formatSize } from '../../../core/utils/format-bytes.util';
import { formatDuration } from '../../../core/utils/format-duration.util';
import type { NetworkEntry } from '../../../features/network/stores/network-log.store';

function transferred(entries: readonly NetworkEntry[]): number {
  let bytes = 0;
  for (const entry of entries) {
    if (entry.kind === 'http') bytes += entry.transfer?.wireBytes ?? entry.size ?? 0;
  }
  return bytes;
}

/** When the last finished request ended, counted from the first one to start. */
function finish(entries: readonly NetworkEntry[]): number | undefined {
  if (entries.length === 0) return undefined;
  let start = Infinity;
  let end = -Infinity;
  for (const entry of entries) {
    start = Math.min(start, entry.startedAt);
    if (entry.duration !== undefined) end = Math.max(end, entry.startedAt + entry.duration);
  }
  return end === -Infinity ? undefined : end - start;
}

/** Chrome's status line under the table. The first number of each pair counts only what is shown. */
export function NetworkSummaryBar({
  visible,
  all,
}: {
  visible: readonly NetworkEntry[];
  all: readonly NetworkEntry[];
}) {
  const filtered = visible.length !== all.length;
  const pair = (shown: string, total: string) => (filtered ? `${shown} / ${total}` : total);

  return (
    <div className="axonpack-net-bar axonpack-net-summary">
      <span>{pair(String(visible.length), String(all.length))} requests</span>
      <span className="axonpack-net-divider" />
      <span>
        {pair(formatSize(transferred(visible)), formatSize(transferred(all)))} transferred
      </span>
      <span className="axonpack-net-divider" />
      <span>Finish: {formatDuration(finish(visible))}</span>
    </div>
  );
}
