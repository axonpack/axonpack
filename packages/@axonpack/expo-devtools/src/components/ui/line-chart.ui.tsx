import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { makeThemedStyles } from '../../utils/themed-styles.util';

const STROKE = 2;
const DEFAULT_HEIGHT = 64;

const LABEL_GUTTER = 6;
const LABEL_OFFSET = 6;

export type LineSeries = {
  label: string;
  values: number[];
  color: string;
};

export function LineChart({
  series,
  domainMax,
  height = DEFAULT_HEIGHT,
  xLabels,
  formatTick,
  pointCapacity,
}: {
  series: LineSeries[];

  domainMax: number;
  height?: number;

  xLabels?: string[];

  formatTick?: (value: number) => string;

  pointCapacity?: number;
}) {
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const [axisWidth, setAxisWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next !== width) setWidth(next);
  };

  const onAxisLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next !== axisWidth) setAxisWidth(next);
  };

  const ticks = [domainMax, domainMax / 2, 0];
  const yOfTick = (value: number) => height - (value / domainMax) * height;
  const labelOf = (tick: number) => (formatTick ? formatTick(tick) : String(Math.round(tick)));
  const widestTick = ticks
    .map(labelOf)
    .reduce((widest, label) => (label.length > widest.length ? label : widest), '');

  return (
    <View>
      <View style={styles.row}>
        {}
        <View style={[styles.axis, { height }]} onLayout={onAxisLayout}>
          {/* Ticks are absolutely positioned to sit on their gridline, so they can't size the
              column. This copy is what gives it a width — without it the axis stays at whatever
              was hard-coded and a tick like "16.3 MB" wraps to two lines. */}
          <Text aria-hidden style={[styles.tickLabel, styles.tickSizer]} numberOfLines={1}>
            {widestTick}
          </Text>
          {ticks.map((tick) => (
            <Text
              key={tick}
              numberOfLines={1}
              style={[styles.tickLabel, { top: yOfTick(tick) - LABEL_OFFSET }]}>
              {labelOf(tick)}
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
                  capacity={Math.max(2, pointCapacity ?? line.values.length)}
                />
              ))
            : null}
        </View>
      </View>
      {xLabels ? <Axes xLabels={xLabels} inset={axisWidth} /> : null}
    </View>
  );
}

function Axes({ xLabels, inset }: { xLabels: string[]; inset: number }) {
  const styles = useStyles();
  return (
    <View style={[styles.xAxis, { marginLeft: inset }]}>
      {xLabels.map((label, index) => (
        <Text
          key={label}
          numberOfLines={1}
          style={[
            styles.tickLabel,
            styles.xTickLabel,
            index === 0 && styles.xTickFirst,
            index === xLabels.length - 1 && styles.xTickLast,
          ]}>
          {label}
        </Text>
      ))}
    </View>
  );
}

function Segments({
  values,
  color,
  domainMax,
  width,
  height,
  capacity,
}: {
  values: number[];
  color: string;
  domainMax: number;
  width: number;
  height: number;
  capacity: number;
}) {
  const styles = useStyles();
  if (values.length < 2) return null;

  const step = width / (capacity - 1);

  const xOf = (index: number) => width - (values.length - 1 - index) * step;
  const yOf = (value: number) => {
    const fraction = Math.min(1, Math.max(0, value / domainMax));

    return height - fraction * height;
  };

  return (
    <>
      {values.slice(0, -1).map((value, index) => {
        const x1 = xOf(index);
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

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  axis: {
    position: 'relative',
    alignItems: 'flex-end',
  },
  tickLabel: {
    position: 'absolute',
    right: LABEL_GUTTER,
    fontSize: 9,
    lineHeight: 12,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  tickSizer: {
    position: 'relative',
    right: 0,
    marginRight: LABEL_GUTTER,
    opacity: 0,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  xTickLabel: {
    position: 'relative',
    right: 0,
    textAlign: 'center',
    flexShrink: 0,
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
    borderRadius: STROKE / 2,
  },
}));
