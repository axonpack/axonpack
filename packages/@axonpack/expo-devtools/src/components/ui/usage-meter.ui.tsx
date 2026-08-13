import { StyleSheet, Text, View } from 'react-native';

import { formatSize } from '../../utils/format-bytes.util';
import { makeThemedStyles } from '../../utils/themed-styles.util';

const TRACK_HEIGHT = 8;

export function UsageMeter({
  label,
  usedBytes,
  totalBytes,
  caption,
}: {
  label: string;
  usedBytes?: number;
  totalBytes?: number;

  caption?: string;
}) {
  const styles = useStyles();
  const known = usedBytes !== undefined && totalBytes !== undefined && totalBytes > 0;

  const fraction = known ? Math.min(1, Math.max(0, usedBytes / totalBytes)) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {known ? `${formatSize(usedBytes)} of ${formatSize(totalBytes)}` : '–'}
        </Text>
      </View>

      <View style={styles.track}>
        {}
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      </View>

      <View style={styles.labelRow}>
        <Text style={styles.caption}>{caption ?? ''}</Text>
        <Text style={styles.caption}>{known ? `${Math.round(fraction * 100)}%` : ''}</Text>
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    gap: 5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  value: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: COLORS.toolbarBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: COLORS.accent,
  },
  caption: {
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
}));
