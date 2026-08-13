import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { NetworkLogEntry } from '../../stores/network/network-log.store';
import { isErrorStatus } from '../../utils/network/formatters.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

const BUCKET_COUNT = 36;
const MAX_BAR_HEIGHT = 20;
const MIN_BAR_HEIGHT = 2;

export type TimeRange = { start: number; end: number };

type Bucket = TimeRange & { count: number; hasError: boolean };

function buildOverview(entries: NetworkLogEntry[]): {
  buckets: Bucket[];
  min: number;
  max: number;
} {
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

    if (isErrorStatus(entry.status, entry.statusCode)) bucket.hasError = true;
  }

  return { buckets, min, max };
}

function formatClockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

function formatSpan(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function OverviewStrip({
  entries,
  activeRange,
  onSelectRange,
}: {
  entries: NetworkLogEntry[];
  activeRange: TimeRange | null;
  onSelectRange: (range: TimeRange | null) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const { buckets, min, max } = useMemo(() => buildOverview(entries), [entries]);

  if (entries.length === 0) return null;

  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <View style={styles.container}>
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

      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>{formatClockTime(min)}</Text>
        {activeRange ? (
          <Text style={[styles.timeLabel, styles.timeLabelActive]}>
            {formatClockTime(activeRange.start)} – {formatClockTime(activeRange.end)}
          </Text>
        ) : (
          <Text style={styles.timeLabel}>{formatSpan(max - min)} total</Text>
        )}
        <Text style={styles.timeLabel}>{formatClockTime(max)}</Text>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    marginHorizontal: 12,
    marginTop: 8,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT + 12,
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
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  timeLabelActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
}));
