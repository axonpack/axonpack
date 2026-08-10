import { StyleSheet, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';

const DEFAULT_HEIGHT = 32;
/** Older samples are dropped rather than squeezed — a 1px bar reads as noise, not as data. */
const MAX_BARS = 60;

/**
 * Bars rather than a path: an SVG line would mean a new dependency, and at this size the difference
 * is not visible. Scaled against its own max, so the shape shows change over time rather than
 * absolute level — the numeric value beside it carries the level.
 */
export function Sparkline({
  values,
  height = DEFAULT_HEIGHT,
  color = COLORS.accent,
}: {
  values: number[];
  height?: number;
  color?: string;
}) {
  const bars = values.slice(-MAX_BARS);
  const max = Math.max(...bars, 1);

  return (
    <View style={[styles.row, { height }]}>
      {bars.map((value, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              // Floored so a non-zero sample never renders as nothing at all.
              height: Math.max(1, (value / max) * height),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
});
