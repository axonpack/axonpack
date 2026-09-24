import {
  STORED_VALUE_ICONS,
  STORED_VALUE_LABELS,
} from '../../../features/storage/constants/value-type-icons.const';
import type { StorageDraftRow } from '../../../features/storage/stores/storage-drafts.store';
import { classifyStoredValue } from '../../../features/storage/utils/classify-value.util';

/** A key added in the empty row and not yet synced. Removed with its ×, since it was never stored. */
export function DraftRow({
  row,
  compact,
  error,
  onRemove,
}: {
  row: StorageDraftRow;
  compact: boolean;
  error: string | undefined;
  onRemove: () => void;
}) {
  const kind = classifyStoredValue(row.text, row.valueType);

  return (
    <div className="axonpack-net-row" data-pending data-error={error !== undefined || undefined}>
      <span title={error ?? `${row.key} is added when you sync`}>
        <span
          className="axonpack-material axonpack-sto-kind-icon"
          data-material={STORED_VALUE_ICONS[kind]}
        />
        {row.key}
      </span>
      {!compact && (
        <>
          <span className="axonpack-sto-kind">{STORED_VALUE_LABELS[kind]}</span>
          <span className="axonpack-sto-value" title={error ?? row.text}>
            {row.text}
          </span>
          <span>
            <button
              className="axonpack-sto-row-button"
              title="Remove this new key"
              onClick={onRemove}>
              ×
            </button>
          </span>
        </>
      )}
    </div>
  );
}
