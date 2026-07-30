import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { COLORS } from './colors';
import type { NetworkLogEntry } from '../../utils/network/networkLogStore';

/** A simplified analog of Chrome's Network tab overview — a tick per request, positioned by relative start time. */
export function OverviewStrip({ entries }: { entries: NetworkLogEntry[] }) {
  const [width, setWidth] = useState(0);

  if (entries.length === 0) return null;

  const startedTimes = entries.map((entry) => entry.startedAt);
  const min = Math.min(...startedTimes);
  const max = Math.max(...startedTimes);
  const range = Math.max(max - min, 1);

  return (
    <View style={styles.strip} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 &&
        entries.map((entry) => {
          const left = ((entry.startedAt - min) / range) * Math.max(width - 4, 0);
          const color =
            entry.status === 'success'
              ? COLORS.success
              : entry.status === 'error'
                ? COLORS.error
                : COLORS.pending;
          return <View key={entry.id} style={[styles.tick, { left, backgroundColor: color }]} />;
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    height: 20,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: COLORS.toolbarBackground,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tick: {
    position: 'absolute',
    top: 4,
    width: 3,
    height: 12,
    borderRadius: 1.5,
  },
});
