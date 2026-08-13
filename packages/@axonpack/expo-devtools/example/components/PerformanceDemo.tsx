import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';
import { devtools } from '../devtools';

function blockThread(ms: number) {
  const until = Date.now() + ms;

  while (Date.now() < until) {}
}

function allocate(megabytes: number) {
  const chunk: number[][] = [];
  for (let index = 0; index < megabytes; index += 1) {
    chunk.push(new Array(131_072).fill(index));
  }
  return chunk;
}

export function PerformanceDemo() {
  const [retained, setRetained] = useState<number[][][]>([]);
  const [spins, setSpins] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Long tasks</Text>
      <Text style={styles.hint}>Blocks the JS thread. Over 50 ms shows up under Long tasks.</Text>
      <View style={styles.row}>
        <ActionButton label="Block 60ms" onPress={() => blockThread(60)} />
        <ActionButton label="Block 150ms" onPress={() => blockThread(150)} />
        <ActionButton label="Block 400ms" onPress={() => blockThread(400)} />
        <ActionButton
          label="Block 3 × 120ms"
          onPress={() => {
            for (let index = 0; index < 3; index += 1)
              setTimeout(() => blockThread(120), index * 50);
          }}
        />
      </View>

      <Text style={styles.heading}>Interactions</Text>
      <Text style={styles.hint}>A slow press handler. Shows up under Interactions.</Text>
      <View style={styles.row}>
        <ActionButton
          label="Slow tap handler (250ms)"
          onPress={() => {
            blockThread(250);
            setSpins((previous) => previous + 1);
          }}
        />
        <Text style={styles.counter}>tapped {spins}×</Text>
      </View>

      <Text style={styles.heading}>User timing</Text>
      <Text style={styles.hint}>Timings you name yourself. Shows up under User timing.</Text>
      <View style={styles.row}>
        <ActionButton
          label="Mark + measure (180ms)"
          onPress={() => {
            devtools.mark('checkout');
            blockThread(180);
            devtools.measure('checkout');
          }}
        />
        <ActionButton
          label="Measure with detail"
          onPress={() => {
            devtools.mark('cart', { detail: { items: 3 } });
            blockThread(60);
            devtools.measure('cart', { start: 'cart', detail: { items: 3 } });
          }}
        />
        <ActionButton label="Single mark" onPress={() => devtools.mark('button:pressed')} />
        <ActionButton label="Clear marks" onPress={() => devtools.clearMarks()} />
      </View>

      <Text style={styles.heading}>JS heap</Text>
      <Text style={styles.hint}>Sampled once a second, so give the graph a moment.</Text>
      <View style={styles.row}>
        <ActionButton
          label="Retain ~10MB"
          onPress={() => setRetained((previous) => [...previous, allocate(10)])}
        />
        <ActionButton
          label="Allocate 20MB, drop it"
          onPress={() => {
            allocate(20);
          }}
        />
        <ActionButton label="Release retained" onPress={() => setRetained([])} />
        <Text style={styles.counter}>{retained.length * 10}MB held</Text>
      </View>

      <Text style={styles.footnote}>
        FPS only measures while the Performance tab is open. Leave it open and press Block to watch
        it dip.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 8,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181c',
    marginTop: 10,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5f6368',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  counter: {
    fontSize: 12,
    color: '#5f6368',
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5f6368',
    marginTop: 18,
  },
});
