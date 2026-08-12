import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { performanceStore } from '../../stores/performance/performance.store';
import { formatSize } from '../../utils/format-bytes.util';
import { UsageMeter } from '../ui/usage-meter.ui';

/**
 * A part-of-whole meter, which is what this data actually is — a pair of byte counts made the reader do the
 * subtraction and the ratio in their head.
 *
 * Android only, deliberately. `StatFs` there needs no permission and no manifest entry, but iOS's
 * `systemFreeSize` is one of Apple's required-reason APIs — no prompt, yet it obliges a privacy manifest
 * declaration at submission, which a library would push onto every app that embeds this package.
 *
 * Both absences say why rather than leaving the card out: a missing card is indistinguishable from one with
 * nothing in it, and "rebuild the app" and "this platform never reports it" call for opposite actions.
 */
export function StorageCard() {
  const { storage, support } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );

  // The meter names what its fill measures; the card header already says which resource that is.
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

const styles = StyleSheet.create({
  card: {
    // Spans the grid rather than sharing a row, so the meter is wide enough for its fill to mean something.
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
});
