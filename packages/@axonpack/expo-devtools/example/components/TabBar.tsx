import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

type TabBarProps<T extends string> = {
  tabs: { key: T; label: string }[];
  activeKey: T;
  onChange: (key: T) => void;
  variant?: 'primary' | 'secondary';
};

/**
 * Scrolls rather than dividing the width, the way the devtools panel's own tab bars do. Equal shares
 * of the screen shrank as tabs were added until a label like `expo/fetch` no longer fit, and every
 * new demo made the ones already there harder to read.
 */
export function TabBar<T extends string>({
  tabs,
  activeKey,
  onChange,
  variant = 'primary',
}: TabBarProps<T>) {
  const isPrimary = variant === 'primary';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Without this the bar takes every spare pixel of height from the column it sits in.
      style={[styles.bar, isPrimary ? styles.barPrimary : styles.barSecondary]}
      contentContainerStyle={styles.barContent}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.button,
            isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
            isPrimary && activeKey === tab.key && styles.buttonPrimaryActive,
            !isPrimary && activeKey === tab.key && styles.buttonSecondaryActive,
          ]}
          onPress={() => onChange(tab.key)}>
          <Text style={isPrimary ? styles.labelPrimary : styles.labelSecondary}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
  },
  barContent: {
    flexDirection: 'row',
  },
  barPrimary: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  barSecondary: {
    backgroundColor: '#f5f5f5',
  },
  // Sized by its own label now rather than by a share of the screen, so the padding is what keeps
  // the tap target big enough.
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    minHeight: 44,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  buttonSecondary: {
    minHeight: 40,
  },
  buttonPrimaryActive: {
    borderBottomColor: '#0a7ea4',
  },
  buttonSecondaryActive: {
    backgroundColor: '#e6f4fe',
  },
  labelPrimary: {
    fontWeight: '600',
    color: '#333',
  },
  labelSecondary: {
    fontWeight: '600',
    fontSize: 13,
    color: '#333',
  },
});
