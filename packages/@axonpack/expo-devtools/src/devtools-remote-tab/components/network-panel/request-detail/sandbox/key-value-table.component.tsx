import {
  ensureTrailingBlankRow,
  type KeyValueRow,
} from '../../../../../features/network/utils/sandbox.util';
import { SyncedInput } from '../../synced-input.component';

/**
 * Key and value cells with no header row, as Scalar draws them: the blank row at the end says what
 * goes where with its placeholders, and becomes the next row when it is typed in.
 */
export function KeyValueTable({
  rows,
  onChange,
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
}) {
  const update = (id: string, patch: Partial<KeyValueRow>) =>
    onChange(
      ensureTrailingBlankRow(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    );

  return (
    <div className="axonpack-sbx-table" role="table">
      {rows.map((row) => {
        const blank = !row.key && !row.value;
        return (
          <div
            key={row.id}
            role="row"
            className="axonpack-sbx-table-row"
            data-off={(!row.enabled && !blank) || undefined}>
            <span>
              {!blank && (
                <input
                  type="checkbox"
                  checked={row.enabled}
                  aria-label="Send this one"
                  onChange={() => update(row.id, { enabled: !row.enabled })}
                />
              )}
            </span>
            <SyncedInput
              value={row.key}
              onChange={(key) => update(row.id, { key })}
              placeholder="Key"
            />
            <SyncedInput
              value={row.value}
              onChange={(value) => update(row.id, { value })}
              placeholder="Value"
            />
            <span>
              {!blank && (
                <button
                  className="axonpack-net-button"
                  data-icon="cross"
                  title="Remove"
                  aria-label="Remove"
                  onClick={() =>
                    onChange(ensureTrailingBlankRow(rows.filter(({ id }) => id !== row.id)))
                  }
                />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
