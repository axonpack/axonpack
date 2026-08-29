import { StyleSheet, Text, View } from 'react-native';

import type { StorageAdapterState, StorageEntry } from '../stores/storage.store';
import { formatSize } from '../../../core/utils/format-bytes.util';
import { describeAdapterKind, formatReadTime } from '../utils/formatters.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { InfoBadge } from '../../../core/components/ui/info-badge.ui';

export function StorageSummary({
  state,
  visibleCount,
}: {
  state: StorageAdapterState;
  visibleCount: number;
}) {
  const styles = useStyles();
  const { adapter, entries } = state;

  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const largest = entries.reduce<StorageEntry | undefined>(
    (biggest, entry) => (biggest === undefined || entry.size > biggest.size ? entry : biggest),
    undefined
  );

  // Stated rather than glossed over: a capped or unenumerable read looks like an empty store
  // otherwise, and that's the one thing a storage inspector must never imply by accident.
  const notes = [
    adapter.canEnumerate
      ? undefined
      : `${adapter.name} can't list its own keys — showing the ${entries.length} you declared.`,
    state.truncated
      ? `Read ${entries.length} of ${state.totalKeys} keys — the rest are past the cap.`
      : undefined,
    adapter.readOnly ? 'Read-only — values here cannot be edited or deleted.' : undefined,
    // Not "3 keys are hidden": the keys are filtered before they are read, so the count of what
    // matched is something this tab deliberately never learns.
    adapter.hasBlacklist ? 'A blacklist is set — any key it matches was never read.' : undefined,
  ].filter((note): note is string => note !== undefined);

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
