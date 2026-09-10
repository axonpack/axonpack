import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

import { TOUCH_TARGET } from '../../constants/metrics.const';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import type { MaterialIconName } from '../ui/icon-button.ui';

export type DevtoolsTab = 'network' | 'console' | 'performance' | 'storage' | 'crashes' | 'debug';

const TABS: { key: DevtoolsTab; label: string; icon: MaterialIconName }[] = [
  { key: 'network', label: 'Network', icon: 'swap-vert' },
  { key: 'console', label: 'Console', icon: 'terminal' },
  { key: 'performance', label: 'Performance', icon: 'speed' },
  { key: 'storage', label: 'Storage', icon: 'storage' },
  { key: 'crashes', label: 'Crashes', icon: 'bug-report' },
  { key: 'debug', label: 'Debug', icon: 'construction' },
];

export function DevtoolsTabBar({
  tab,
  onChange,
  badges,
}: {
  tab: DevtoolsTab;
  onChange: (tab: DevtoolsTab) => void;

  badges?: Partial<Record<DevtoolsTab, number>>;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.rowContent}
      keyboardShouldPersistTaps="handled">
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
              color={active ? COLORS.toolbarTextActive : COLORS.toolbarText}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
            {!active && badge ? <Text style={styles.badge}>{badge}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    flex: 1,
  },
  rowContent: {
    flexGrow: 1,
    alignItems: 'stretch',
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
    borderBottomColor: COLORS.toolbarTextActive,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.toolbarText,
  },
  labelActive: {
    color: COLORS.toolbarTextActive,
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
}));
