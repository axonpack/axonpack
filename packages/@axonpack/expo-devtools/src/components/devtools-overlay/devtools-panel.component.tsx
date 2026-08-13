import { useMemo, useState, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { DevtoolsTabBar, type DevtoolsTab } from './devtools-tab-bar.component';
import { ThemePicker } from './theme-picker.component';
import { consoleLogStore } from '../../stores/console/console-log.store';
import { devtoolsTabStore } from '../../stores/devtools-tab.store';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { ConsoleView } from '../console/console-view.component';
import { NetworkView } from '../network/network-view.component';
import { PerformanceView } from '../performance/performance-view.component';
import { IconButton } from '../ui/icon-button.ui';

export function DevtoolsPanel({ onClose }: { onClose: () => void }) {
  const styles = useStyles();
  const COLORS = useThemeColors();

  const [tab, setTab] = useState<DevtoolsTab>(devtoolsTabStore.get);
  const consoleEntries = useSyncExternalStore(
    consoleLogStore.subscribe,
    consoleLogStore.getSnapshot
  );

  const consoleErrorCount = useMemo(
    () => consoleEntries.filter((entry) => entry.level === 'error').length,
    [consoleEntries]
  );

  const tabContent = useMemo(() => {
    switch (tab) {
      case 'network':
        return <NetworkView />;
      case 'console':
        return <ConsoleView />;
      case 'performance':
        return <PerformanceView />;
      default:
        return null;
    }
  }, [tab]);

  return (
    <KeyboardAvoidingView
      style={styles.panel}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {}
      <View style={styles.header}>
        <DevtoolsTabBar
          tab={tab}
          onChange={(next) => {
            setTab(next);
            devtoolsTabStore.set(next);
          }}
          badges={{ console: consoleErrorCount }}
        />
        <ThemePicker />
        <IconButton name="close" color={COLORS.textSecondary} onPress={onClose} hitSlop={12} />
      </View>

      <View style={styles.tabPanel}>{tabContent}</View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  panel: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.toolbarBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tabPanel: {
    flex: 1,
  },
  hiddenTabPanel: {
    display: 'none',
  },
}));
