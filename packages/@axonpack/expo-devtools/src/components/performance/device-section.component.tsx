import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import type { StorageInfo, SystemMemorySample } from '../../stores/performance/performance.store';
import { formatSize } from '../../utils/format-bytes.util';
import { CollapsibleSection } from '../ui/collapsible-section.ui';
import { UsageMeter } from '../ui/usage-meter.ui';

/**
 * Two part-of-whole meters, which is what this data actually is — a row of numbers made the reader do the
 * subtraction and the ratio in their head.
 *
 * Storage is Android-only, deliberately. `StatFs` there needs no permission and no manifest entry, but
 * iOS's `systemFreeSize` is one of Apple's required-reason APIs — no prompt, yet it obliges a privacy
 * manifest declaration at submission, which a library would push onto every consumer.
 */
export function DeviceSection({
  latest,
  storage,
  available,
}: {
  latest?: SystemMemorySample;
  storage?: StorageInfo;
  available: boolean;
}) {
  // Says why rather than vanishing: an absent section is indistinguishable from a section with nothing
  // in it, and the difference here is "rebuild the app" versus "wait a second".
  if (!available) {
    return (
      <CollapsibleSection title="Device">
        <View style={styles.body}>
          <Text style={styles.note}>
            Needs a dev build. The rest of this tab works without one.
          </Text>
        </View>
      </CollapsibleSection>
    );
  }

  const totalMemory = latest?.totalBytes;
  const availableMemory = latest?.availableToAppBytes;
  const usedMemory =
    totalMemory !== undefined && availableMemory !== undefined
      ? totalMemory - availableMemory
      : undefined;

  const usedStorage =
    storage?.totalBytes !== undefined && storage.freeBytes !== undefined
      ? storage.totalBytes - storage.freeBytes
      : undefined;

  if (totalMemory === undefined && storage === undefined) return null;

  return (
    <CollapsibleSection title="Device">
      <View style={styles.body}>
        <UsageMeter
          label="Memory"
          usedBytes={usedMemory}
          totalBytes={totalMemory}
          // Named rather than called "free": Android reports system-wide free memory here, iOS reports
          // what this process may still claim before being killed.
          caption={
            availableMemory !== undefined
              ? `${formatSize(availableMemory)} available to this app`
              : undefined
          }
        />

        {storage !== undefined ? (
          <UsageMeter
            label="Storage"
            usedBytes={usedStorage}
            totalBytes={storage.totalBytes}
            caption={
              storage.freeBytes !== undefined ? `${formatSize(storage.freeBytes)} free` : undefined
            }
          />
        ) : (
          <Text style={styles.note}>
            Storage is Android only. On iOS, reading it would make your App Store submission declare
            a disk-space reason.
          </Text>
        )}
      </View>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
});
