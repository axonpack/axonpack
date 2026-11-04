import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

import {
  navigationStore,
  useNavigationStore,
} from '../../../features/navigation/stores/navigation.store';
import { queryStore, useQueryStore } from '../../../features/query/stores/query.store';
import { reduxStore, useReduxStore } from '../../../features/redux/stores/redux.store';
import { TOUCH_TARGET } from '../../constants/metrics.const';
import { supportsStore, useSupportsStore, type DevtoolsSupport } from '../../stores/supports.store';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import type { MaterialIconName } from '../ui/icon-button.ui';

export type DevtoolsTab =
  | 'network'
  | 'console'
  | 'performance'
  | 'storage'
  | 'query'
  | 'navigation'
  | 'redux'
  | 'crashes'
  | 'ai-usage'
  | 'debug';

type TabEntry = { key: string; label: string; icon: MaterialIconName };

const TABS: (TabEntry & { key: DevtoolsTab })[] = [
  { key: 'network', label: 'Network', icon: 'swap-vert' },
  { key: 'console', label: 'Console', icon: 'terminal' },
  { key: 'performance', label: 'Performance', icon: 'speed' },
  { key: 'storage', label: 'Storage', icon: 'storage' },
  { key: 'query', label: 'Query', icon: 'cached' },
  { key: 'navigation', label: 'Navigation', icon: 'alt-route' },
  { key: 'redux', label: 'Redux', icon: 'data-object' },
  { key: 'crashes', label: 'Crashes', icon: 'bug-report' },
  // The tab was called AI Usage. Its key, its panel id and its code in features/ai-usage keep that
  // name.
  { key: 'ai-usage', label: 'CLI', icon: 'smart-toy' },
  { key: 'debug', label: 'Debug', icon: 'construction' },
];

/**
 * The tabs to offer. One given `false` is left out: the app has nothing it could ever show there.
 * The supports' tabs go before Crashes.
 */
export function shownTabs(
  available: Partial<Record<DevtoolsTab, boolean>>,
  supports: DevtoolsSupport[] = []
): TabEntry[] {
  const tabs: TabEntry[] = TABS.filter(({ key }) => available[key] !== false);
  const crashes = tabs.findIndex(({ key }) => key === 'crashes');
  tabs.splice(
    crashes,
    0,
    ...supports.map(({ id, title, icon }) => ({ key: id, label: title, icon }))
  );
  return tabs;
}

export function DevtoolsTabBar({
  tab,
  onChange,
  badges,
}: {
  tab: string;
  onChange: (tab: string) => void;

  badges?: Partial<Record<string, number>>;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  // Tabs that are not always there: an app with no router, one that handed over no TanStack
  // Query client, or one with no store using the Redux enhancer.
  const routerKind = useNavigationStore(navigationStore.getRouterKind);
  const hasQueryClient = useQueryStore(queryStore.hasClient);
  const reduxAttached = useReduxStore(reduxStore.isAttached);
  const supports = useSupportsStore(supportsStore.getSupports);
  const tabs = shownTabs(
    { navigation: routerKind !== null, query: hasQueryClient, redux: reduxAttached },
    supports
  );
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.rowContent}
      keyboardShouldPersistTaps="handled">
      {tabs.map(({ key, label, icon }) => {
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
