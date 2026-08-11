import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import type { StorageInfo, SystemMemorySample } from '../../stores/performance/performance.store';
import { formatSize } from '../../utils/format-bytes.util';
import { CollapsibleSection } from '../ui/collapsible-section.ui';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function percentOf(part?: number, whole?: number): string {
  if (part === undefined || whole === undefined || whole <= 0) return '';
  return ` (${Math.round((part / whole) * 100)}%)`;
}

/**
 * Device-level figures, which need the native module — the JS runtime has no idea how much RAM the phone
 * has. Hidden entirely when that module isn't installed, rather than showing a column of dashes.
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
          <Text style={styles.rowLabel}>
            Device memory needs the native module, so it needs a development build. Everything else
            on this tab works without one.
          </Text>
        </View>
      </CollapsibleSection>
    );
  }

  const hasMemory = latest?.totalBytes !== undefined || latest?.appBytes !== undefined;
  const usedStorage =
    storage?.totalBytes !== undefined && storage.freeBytes !== undefined
      ? storage.totalBytes - storage.freeBytes
      : undefined;
  if (!hasMemory && storage === undefined) return null;

  return (
    <CollapsibleSection title="Device">
      <View style={styles.body}>
        <>
          <Row label="Device RAM" value={formatSize(latest?.totalBytes)} />
          {/* Android reports system-wide free RAM; iOS reports what this process may still allocate,
                so the label has to describe the honest meaning rather than claim "free". */}
          <Row
            label="Available to this app"
            value={`${formatSize(latest?.availableToAppBytes)}${percentOf(
              latest?.availableToAppBytes,
              latest?.totalBytes
            )}`}
          />
        </>
        {storage !== undefined ? (
          <>
            <Row label="Storage" value={formatSize(storage.totalBytes)} />
            <Row
              label="Used"
              value={`${formatSize(usedStorage)}${percentOf(usedStorage, storage.totalBytes)}`}
            />
            <Row label="Free" value={formatSize(storage.freeBytes)} />
          </>
        ) : (
          // Says why rather than leaving a gap: on iOS this is a deliberate omission, not a failure.
          <Text style={styles.rowLabel}>
            Storage isn&apos;t shown on iOS — reading it would oblige every app using this package
            to declare a disk-space reason at submission.
          </Text>
        )}
      </View>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 4,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
