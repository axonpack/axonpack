import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import type { NetworkLogEntry } from '../../stores/network/network-log.store';
import { getStatusColor } from '../../utils/network/formatters.util';

const BUCKET_COUNT = 36;
const MAX_BAR_HEIGHT = 20;
const MIN_BAR_HEIGHT = 2;

export type TimeRange = { start: number; end: number };

type Bucket = TimeRange & { count: number; hasError: boolean };

function buildBuckets(entries: NetworkLogEntry[]): Bucket[] {
  const startedTimes = entries.map((entry) => entry.startedAt);
  const min = Math.min(...startedTimes);
  const max = Math.max(...startedTimes);
  const bucketDuration = Math.max(max - min, 1) / BUCKET_COUNT;

  const buckets: Bucket[] = Array.from({ length: BUCKET_COUNT }, (_, index) => ({
    start: min + index * bucketDuration,
    end: min + (index + 1) * bucketDuration,
    count: 0,
    hasError: false,
  }));

  for (const entry of entries) {
    const index = Math.min(BUCKET_COUNT - 1, Math.floor((entry.startedAt - min) / bucketDuration));
    const bucket = buckets[index];
    bucket.count += 1;
    if (getStatusColor(entry.status, entry.statusCode) === COLORS.error) bucket.hasError = true;
  }

  return buckets;
}

/**
 * A compact activity histogram — request count per time bucket, buckets with a failure
 * highlighted red. Tapping a bucket filters the list to that time window (tapping the same
 * bucket again clears it). Deliberately not a Chrome-style per-request waterfall: duration bars
 * collide once several requests overlap on a narrow screen, and there's no phase-breakdown data
 * to anchor a precise timeline against anyway (see ROADMAP's hard limits).
 */
export function OverviewStrip({
  entries,
  activeRange,
  onSelectRange,
}: {
  entries: NetworkLogEntry[];
  activeRange: TimeRange | null;
  onSelectRange: (range: TimeRange | null) => void;
}) {
  const buckets = useMemo(() => buildBuckets(entries), [entries]);

  if (entries.length === 0) return null;

  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <View style={styles.strip}>
      {buckets.map((bucket, index) => {
        const isActive = activeRange !== null && activeRange.start === bucket.start;
        const height =
          bucket.count === 0
            ? 0
            : Math.max(MIN_BAR_HEIGHT, (bucket.count / maxCount) * MAX_BAR_HEIGHT);

        return (
          <TouchableOpacity
            key={index}
            style={[styles.barColumn, isActive && styles.barColumnActive]}
            disabled={bucket.count === 0}
            onPress={() =>
              onSelectRange(isActive ? null : { start: bucket.start, end: bucket.end })
            }>
            <View
              style={[
                styles.bar,
                { height, backgroundColor: bucket.hasError ? COLORS.error : COLORS.accent },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT + 12,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 2,
    paddingBottom: 4,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: 3,
  },
  barColumnActive: {
    backgroundColor: COLORS.sectionTint,
  },
  bar: {
    width: '60%',
    borderRadius: 1,
  },
});
