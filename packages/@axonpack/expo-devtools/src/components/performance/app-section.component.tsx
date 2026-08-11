import { StyleSheet, View } from 'react-native';

import { AppMemoryCard } from './app-memory-card.component';
import { FpsChartCard } from './fps-chart-card.component';
import { HeapCard } from './heap-card.component';
import { InteractionCard } from './interaction-card.component';
import { CollapsibleSection } from '../ui/collapsible-section.ui';

/**
 * Everything about this app, as opposed to the device it runs on. Each card owns its own store
 * subscription, so a once-a-second sample or a twice-a-second frame count re-renders one tile rather than
 * the whole tab and its entry list.
 *
 * JS heap sits next to app memory because the two are routinely read as interchangeable and are not. The
 * frame rates share one chart for the same reason — the gap between them is the reading that matters.
 */
export function AppSection() {
  return (
    <CollapsibleSection title="App">
      <View style={styles.grid}>
        <HeapCard />
        <AppMemoryCard />
        <InteractionCard />
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
