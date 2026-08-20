import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { performanceStore } from '../stores/performance.store';
import { formatSize } from '../../../core/utils/format-bytes.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { UsageMeter } from '../../../core/components/ui/usage-meter.ui';

export function StorageCard() {
  const styles = useStyles();
  const { storage, support } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );

  const usedBytes =
    storage?.totalBytes !== undefined && storage.freeBytes !== undefined
      ? storage.totalBytes - storage.freeBytes
      : undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Storage</Text>

      {!support.systemMemory ? (
        <Text style={styles.note}>Needs a dev build. The rest of this tab works without one.</Text>
      ) : storage === undefined ? (
        <Text style={styles.note}>
          Android only. On iOS, reading it would make your App Store submission declare a disk-space
          reason.
        </Text>
      ) : (
        <UsageMeter
          label="Used"
          usedBytes={usedBytes}
          totalBytes={storage.totalBytes}
          caption={
            storage.freeBytes !== undefined ? `${formatSize(storage.freeBytes)} free` : undefined
          }
        />
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  card: {
    width: '100%',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
}));
