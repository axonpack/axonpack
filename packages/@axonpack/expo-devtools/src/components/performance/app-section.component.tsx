import { StyleSheet, View } from 'react-native';

import { FpsChartCard } from './fps-chart-card.component';
import { MemoryChartCard } from './memory-chart-card.component';
import { InteractionCard } from './interaction-card.component';
import { CollapsibleSection } from '../ui/collapsible-section.ui';

/**
 * Everything about this app, as opposed to the device it runs on. Each card owns its own store
 * subscription, so a once-a-second sample or a twice-a-second frame count re-renders one tile rather than
 * the whole tab and its entry list.
 *
 * The memory card stacks the JS heap above the app's footprint as small multiples, because they are the
 * same unit at wildly different magnitudes. The frame rates share one chart instead, because they share a
 * scale as well as a unit — and there the gap between the lines is the reading that matters.
 */
export function AppSection() {
  return (
    <CollapsibleSection title="App">
      <View style={styles.grid}>
        <InteractionCard />
        <MemoryChartCard />
        <FpsChartCard />
      </View>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  // Two per row at typical widths, wrapping to one on narrow screens — the cards carry a minWidth.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
});
