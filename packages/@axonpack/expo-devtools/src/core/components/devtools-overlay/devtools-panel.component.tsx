import { useMemo, useState, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevtoolsTabBar, type DevtoolsTab } from './devtools-tab-bar.component';
import { ThemePicker } from './theme-picker.component';
import { ConsoleView } from '../../../features/console/components/console-view.component';
import { consoleLogStore } from '../../../features/console/stores/console-log.store';
import { CrashInspectionSheet } from '../../../features/crash/components/crash-inspection-sheet.component';
import { CrashView } from '../../../features/crash/components/crash-view.component';
import { crashStore } from '../../../features/crash/stores/crash.store';
import { DebugView } from '../../../features/debug/components/debug-view.component';
import { NetworkView } from '../../../features/network/components/network-view.component';
import { PerformanceView } from '../../../features/performance/components/performance-view.component';
import { StorageView } from '../../../features/storage/components/storage-view.component';
import { HIT_SLOP } from '../../constants/metrics.const';
import { devtoolsTabStore } from '../../stores/devtools-tab.store';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { IconButton } from '../ui/icon-button.ui';

export function DevtoolsPanel({ onClose }: { onClose: () => void }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  /**
   * The header carries the top inset rather than the panel around it, so the area behind the status
   * bar is painted the toolbar's colour. Painted by the panel background instead, it read as a strip
   * of a different colour above the header.
   */
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<DevtoolsTab>(devtoolsTabStore.get);
  const consoleEntries = useSyncExternalStore(
    consoleLogStore.subscribe,
    consoleLogStore.getSnapshot
  );
  const crashRecords = useSyncExternalStore(crashStore.subscribe, crashStore.getSnapshot);

  // Crashes as well as errors: a crash is its own level now, and counting only `error` quietly
  // stopped the badge reporting the very rows most worth walking over to.
  const consoleErrorCount = useMemo(
    () =>
      consoleEntries.filter((entry) => entry.level === 'error' || entry.level === 'crash').length,
    [consoleEntries]
  );

  const unseenCrashCount = useMemo(
    () => crashRecords.filter((record) => !record.seen).length,
    [crashRecords]
  );

  const tabContent = useMemo(() => {
    switch (tab) {
      case 'network':
        return <NetworkView />;
      case 'console':
        return <ConsoleView />;
      case 'performance':
        return <PerformanceView />;
      case 'storage':
        return <StorageView />;
      case 'crashes':
        return <CrashView />;
      case 'debug':
        return <DebugView />;
      default:
        return null;
    }
  }, [tab]);

  return (
    <KeyboardAvoidingView
      style={styles.panel}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <DevtoolsTabBar
          tab={tab}
          onChange={(next) => {
            setTab(next);
            devtoolsTabStore.set(next);
          }}
          badges={{ console: consoleErrorCount, crashes: unseenCrashCount }}
        />
        <ThemePicker />
        <IconButton
          name="close"
          color={COLORS.toolbarText}
          onPress={onClose}
          hitSlop={HIT_SLOP.default}
        />
      </View>

      <View style={styles.tabPanel}>{tabContent}</View>

      <CrashInspectionSheet />
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
