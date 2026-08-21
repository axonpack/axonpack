import { Text, View } from 'react-native';

import { useDetailStyles } from './shared.styles';
import type { StorageAdapter } from '../../services/define-adapter.service';
import { STORED_VALUE_LABELS } from '../../constants/value-type-icons.const';
import type { StorageAdapterState, StorageEntry } from '../../stores/storage.store';
import { formatSize } from '../../../../core/utils/format-bytes.util';
import { describeAdapterKind, formatReadTime } from '../../utils/formatters.util';

export function InfoTab({
  entry,
  adapter,
  state,
}: {
  entry: StorageEntry;
  adapter: StorageAdapter;
  state: StorageAdapterState;
}) {
  const styles = useDetailStyles();

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
    <View style={styles.section}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue} selectable>
            {value}
          </Text>
        </View>
      ))}

      {entry.error !== undefined && <Text style={styles.error}>{entry.error}</Text>}
    </View>
  );
}
