import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { formatSize } from '../../utils/format-bytes.util';

const TRACK_HEIGHT = 8;

/**
 * A part-of-whole meter: one measure, used against a total.
 *
 * Deliberately not a chart. The data's job here is a single headline magnitude, which a stat tile with a
 * meter answers better than any plot — and a single series needs no legend, because the label names it.
 *
 * The fill is one hue, never graded green/amber/red. Status colours are reserved for real state and have
 * to ship with a label rather than colour alone, and there is no honest threshold at which device RAM
 * becomes "bad" — inventing one would be decoration dressed as meaning. The numbers carry the judgement.
 */
export function UsageMeter({
  label,
  usedBytes,
  totalBytes,
  caption,
}: {
  label: string;
  usedBytes?: number;
  totalBytes?: number;
  /** Secondary detail under the bar, e.g. the split this total is made of. */
  caption?: string;
}) {
  const known = usedBytes !== undefined && totalBytes !== undefined && totalBytes > 0;
  // Clamped: a sampled "used" can momentarily exceed a cached total, and a bar past its own track reads
  // as a rendering bug rather than as data.
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
        {/* Width as a percentage string so the bar tracks its container without measuring it. */}
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      </View>

      <View style={styles.labelRow}>
        <Text style={styles.caption}>{caption ?? ''}</Text>
        <Text style={styles.caption}>{known ? `${Math.round(fraction * 100)}%` : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  // Values wear text tokens, not the fill's colour — the bar beside them already carries identity.
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
});
