import { formatSize } from '../../../../core/utils/format-bytes.util';
import { STORED_VALUE_LABELS } from '../../../../features/storage/constants/value-type-icons.const';
import type {
  StorageAdapterState,
  StorageEntry,
} from '../../../../features/storage/stores/storage.store';
import {
  describeAdapterKind,
  formatReadTime,
} from '../../../../features/storage/utils/formatters.util';

export function InfoTab({ entry, state }: { entry: StorageEntry; state: StorageAdapterState }) {
  const { adapter } = state;
  const rows: [string, string][] = [
    ['Key', entry.key],
    ['Store', `${adapter.name} (${describeAdapterKind(adapter.kind)})`],
    ['Shown as', STORED_VALUE_LABELS[entry.kind]],
    ['Stored as', entry.valueType],
    ['Size', `${formatSize(entry.size)} (${entry.text?.length ?? 0} characters)`],
    ['Read', formatReadTime(state.readAt)],
    ['Editable', adapter.canEdit ? 'yes' : 'no'],
    ['Deletable', adapter.canDelete ? 'yes' : 'no'],
  ];

  return (
    <>
      <div className="axonpack-net-kv" style={{ paddingTop: 8 }}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      {entry.error !== undefined && (
        <p className="axonpack-net-none" data-tone="error">
          {entry.error}
        </p>
      )}
    </>
  );
}
