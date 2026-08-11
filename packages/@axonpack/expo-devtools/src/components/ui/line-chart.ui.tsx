import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { COLORS } from '../../constants/colors.const';

const STROKE = 2;
const DEFAULT_HEIGHT = 64;
const AXIS_WIDTH = 26;
/** Half the label's line height, so a tick sits centred on its own gridline rather than below it. */
const LABEL_OFFSET = 6;

export type LineSeries = {
  label: string;
  values: number[];
  color: string;
};

/**
 * A multi-series line chart built from rotated Views — one per segment — so this needs no SVG or charting
 * dependency. `react-native-svg` would draw smoother joins, but it is a native dependency, and this
 * package earns its keep by installing without one.
 *
 * The domain is fixed by the caller, never derived from the data: a frame rate wobbling between 58 and 60
 * scaled to its own range reads as a catastrophe. Height therefore means absolute value.
 *
 * Two rules from the visualization guidance shape this: a single axis (both series here share a unit, so
 * they legitimately share one scale — this is not a dual-axis chart), and identity never carried by
 * colour alone, which is why the caller pairs it with direct labels.
 */
export function LineChart({
  series,
  domainMax,
  height = DEFAULT_HEIGHT,
  xLabels,
  formatTick,
}: {
  series: LineSeries[];
  /**
   * The top of the scale, supplied rather than derived. Deriving it here from the visible window would
   * make the axis rescale as data enters and leaves the buffer, so the line would jitter and two moments
   * could not be compared. The caller owns that policy.
   */
  domainMax: number;
  height?: number;
  /**
   * Left-to-right ticks for the horizontal axis, oldest first. Supplied rather than derived, because only
   * the caller knows what the spacing means — a point here is a bucket of samples, not a clock reading.
   */
  xLabels?: string[];
  /** Formats the y-axis ticks. Defaults to a rounded number, which is right for counts, not bytes. */
  formatTick?: (value: number) => string;
}) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next !== width) setWidth(next);
  };

  // Three is enough to read a value off: the ceiling, the midpoint and the floor. More gridlines would
  // compete with the data for attention without telling you anything the midpoint doesn't.
  const ticks = [domainMax, domainMax / 2, 0];
  const yOfTick = (value: number) => height - (value / domainMax) * height;

  return (
    <View>
      <View style={styles.row}>
        {/* Labelled axis, so a line's height is a number rather than a vibe. */}
        <View style={[styles.axis, { height }]}>
          {ticks.map((tick) => (
            <Text key={tick} style={[styles.tickLabel, { top: yOfTick(tick) - LABEL_OFFSET }]}>
              {formatTick ? formatTick(tick) : Math.round(tick)}
            </Text>
          ))}
        </View>

        <View style={[styles.plot, { height }]} onLayout={onLayout}>
          {ticks.map((tick) => (
            <View key={tick} style={[styles.gridline, { top: yOfTick(tick) }]} />
          ))}

          {width > 0
            ? series.map((line) => (
                <Segments
                  key={line.label}
                  values={line.values}
                  color={line.color}
                  domainMax={domainMax}
                  width={width}
                  height={height}
                />
              ))
            : null}
        </View>
      </View>
      {xLabels ? <Axes xLabels={xLabels} /> : null}
    </View>
  );
}

function Axes({ xLabels }: { xLabels: string[] }) {
  return (
    <View style={styles.xAxis}>
      {xLabels.map((label, index) => (
        <Text
          key={label}
          style={[
            styles.tickLabel,
            styles.xTickLabel,
            // The end labels hug their edges so they mark the actual span rather than floating inside it.
            index === 0 && styles.xTickFirst,
            index === xLabels.length - 1 && styles.xTickLast,
          ]}>
          {label}
        </Text>
      ))}
    </View>
  );
}

/**
 * Each segment is a 2px View rotated to the angle between two points. Rotation happens about the View's
 * centre, so the left edge is offset by half the difference between the segment's length and its
 * horizontal span — without that correction every segment drifts right of where it belongs.
 */
function Segments({
  values,
  color,
  domainMax,
  width,
  height,
}: {
  values: number[];
  color: string;
  domainMax: number;
  width: number;
  height: number;
}) {
  if (values.length < 2) return null;

  const step = width / (values.length - 1);
  const yOf = (value: number) => {
    const fraction = Math.min(1, Math.max(0, value / domainMax));
    // Inverted: a higher value sits closer to the top.
    return height - fraction * height;
  };

  return (
    <>
      {values.slice(0, -1).map((value, index) => {
        const x1 = index * step;
        const y1 = yOf(value);
        const y2 = yOf(values[index + 1]);
        const dx = step;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        return (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor: color,
                width: length,
                left: x1 - (length - dx) / 2,
                top: (y1 + y2) / 2 - STROKE / 2,
                transform: [{ rotate: `${angle}rad` }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  axis: {
    position: 'relative',
    width: AXIS_WIDTH,
  },
  tickLabel: {
    position: 'absolute',
    right: 6,
    fontSize: 9,
    lineHeight: 12,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  // Offset by the y-axis gutter so the horizontal ticks line up with the plot, not with the labels.
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: AXIS_WIDTH,
    marginTop: 3,
  },
  xTickLabel: {
    position: 'relative',
    right: 0,
    textAlign: 'center',
  },
  xTickFirst: {
    textAlign: 'left',
  },
  xTickLast: {
    textAlign: 'right',
  },
  plot: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  // Recessive on purpose: a reference the eye can find, not a feature competing with the lines.
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  segment: {
    position: 'absolute',
    height: STROKE,
    // Rounded ends so joins read as a continuous stroke rather than a chain of tiles.
    borderRadius: STROKE / 2,
  },
});
