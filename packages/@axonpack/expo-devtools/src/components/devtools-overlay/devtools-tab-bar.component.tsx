import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { TOUCH_TARGET } from '../../constants/metrics.const';
import type { MaterialIconName } from '../ui/icon-button.ui';

export type DevtoolsTab = 'network' | 'console' | 'performance';

const TABS: { key: DevtoolsTab; label: string; icon: MaterialIconName }[] = [
  { key: 'network', label: 'Network', icon: 'swap-vert' },
  { key: 'console', label: 'Console', icon: 'terminal' },
  { key: 'performance', label: 'Performance', icon: 'speed' },
];

export function DevtoolsTabBar({
  tab,
  onChange,
  badges,
}: {
  tab: DevtoolsTab;
  onChange: (tab: DevtoolsTab) => void;
  /** Count shown on a tab that isn't currently open — how an error logged elsewhere gets noticed. */
  badges?: Partial<Record<DevtoolsTab, number>>;
}) {
  return (
    <View style={styles.row}>
      {TABS.map(({ key, label, icon }) => {
        const active = tab === key;
        const badge = badges?.[key];

        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(key)}
            style={[styles.tab, active && styles.tabActive]}>
            <MaterialIcons
              name={icon}
              size={16}
              color={active ? COLORS.accent : COLORS.textSecondary}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
            {!active && badge ? <Text style={styles.badge}>{badge}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.toolbarBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    minHeight: TOUCH_TARGET.min,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.accent,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  labelActive: {
    color: COLORS.accent,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    textAlign: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
