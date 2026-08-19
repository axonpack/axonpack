import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '../ui/chip.ui';

export type PerformanceSection = 'statistics' | 'longTasks' | 'userTiming' | 'interactions';

const SECTIONS: { key: PerformanceSection; label: string }[] = [
  { key: 'statistics', label: 'Statistics' },
  { key: 'userTiming', label: 'User timing' },
  { key: 'interactions', label: 'Interactions' },
  { key: 'longTasks', label: 'Long tasks' },
];

export function SectionChips({
  section,
  onChange,
  counts,
}: {
  section: PerformanceSection;
  onChange: (section: PerformanceSection) => void;

  counts?: Partial<Record<PerformanceSection, number>>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.stripContent}
      keyboardShouldPersistTaps="handled">
      {SECTIONS.map(({ key, label }) => {
        const count = counts?.[key];

        return (
          <Chip
            key={key}
            label={count ? `${label} ${count}` : label}
            active={section === key}
            onPress={() => onChange(key)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The strip shrinks and scrolls rather than pushing the toolbar's trailing controls off the row.
  strip: {
    flexShrink: 1,
  },
  stripContent: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingRight: 4,
  },
});
