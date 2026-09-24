import { formatSize } from '../../../core/utils/format-bytes.util';
import type { StorageAdapterState } from '../../../features/storage/stores/storage.store';
import { summarizeStorage } from '../../../features/storage/utils/summary.util';

/** Chrome's status line under the table, with the app's counts. */
export function StorageStatusBar({
  state,
  visibleCount,
}: {
  state: StorageAdapterState;
  visibleCount: number;
}) {
  const { totalBytes, largest } = summarizeStorage(state);
  const total = state.entries.length;

  return (
    <div className="axonpack-net-bar axonpack-net-summary">
      <span>{visibleCount === total ? `${total} keys` : `${visibleCount} / ${total} keys`}</span>
      <span className="axonpack-net-divider" />
      <span>{formatSize(totalBytes)}</span>
      {largest && largest.size > 0 && (
        <>
          <span className="axonpack-net-divider" />
          <span title={largest.key}>{`Largest: ${largest.key} · ${formatSize(largest.size)}`}</span>
        </>
      )}
    </div>
  );
}
