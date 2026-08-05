import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TabBarProps<T extends string> = {
  tabs: { key: T; label: string }[];
  activeKey: T;
  onChange: (key: T) => void;
  variant?: 'primary' | 'secondary';
};

export function TabBar<T extends string>({
  tabs,
  activeKey,
  onChange,
  variant = 'primary',
}: TabBarProps<T>) {
  const isPrimary = variant === 'primary';

  return (
    <View style={[styles.bar, isPrimary ? styles.barPrimary : styles.barSecondary]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
  },
  barPrimary: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  barSecondary: {
    backgroundColor: '#f5f5f5',
  },
  button: {
    flex: 1,
    alignItems: 'center',
  },
  buttonPrimary: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  buttonSecondary: {
    paddingVertical: 10,
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
