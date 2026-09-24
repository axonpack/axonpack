import { StyleSheet, Text, View } from 'react-native';

import { InfoBadge } from '../../../core/components/ui/info-badge.ui';
import { formatSize } from '../../../core/utils/format-bytes.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import type { StorageAdapterState } from '../stores/storage.store';
import { describeAdapterKind, formatReadTime } from '../utils/formatters.util';
import { summarizeStorage } from '../utils/summary.util';

export function StorageSummary({
  state,
  visibleCount,
}: {
  state: StorageAdapterState;
  visibleCount: number;
}) {
  const styles = useStyles();
  const { adapter, entries } = state;

  const { totalBytes, largest, notes } = summarizeStorage(state);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {adapter.name}
        </Text>
        <InfoBadge label={describeAdapterKind(adapter.kind)} />
        <Text style={styles.readAt}>{formatReadTime(state.readAt)}</Text>
      </View>

      <View style={styles.badges}>
        <InfoBadge
          icon="vpn-key"
          label={
            visibleCount === entries.length
              ? `${entries.length} keys`
              : `${visibleCount} of ${entries.length} keys`
          }
        />
        <InfoBadge icon="data-usage" label={formatSize(totalBytes)} />
        {largest && largest.size > 0 && (
          <InfoBadge icon="trending-up" label={`${largest.key} · ${formatSize(largest.size)}`} />
        )}
      </View>

      {state.status === 'error' && <Text style={styles.error}>{state.error}</Text>}
      {notes.map((note) => (
        <Text key={note} style={styles.note}>
          {note}
        </Text>
      ))}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  readAt: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  error: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.error,
  },
}));
