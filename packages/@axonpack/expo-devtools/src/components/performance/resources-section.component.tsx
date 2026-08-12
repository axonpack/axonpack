import { StyleSheet, View } from 'react-native';

import { FpsChartCard } from './fps-chart-card.component';
import { InteractionCard } from './interaction-card.component';
import { MemoryChartCard } from './memory-chart-card.component';
import { StorageCard } from './storage-card.component';
import { CollapsibleSection } from '../ui/collapsible-section.ui';

export function ResourcesSection() {
  return (
    <CollapsibleSection title="Resources">
      <View style={styles.grid}>
        <FpsChartCard />
        <InteractionCard />
        <MemoryChartCard />
        <StorageCard />
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
