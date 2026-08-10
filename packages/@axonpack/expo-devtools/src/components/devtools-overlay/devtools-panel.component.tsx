import { useMemo, useState, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { DevtoolsTabBar, type DevtoolsTab } from './devtools-tab-bar.component';
import { PanelBrand } from './panel-brand.component';
import { COLORS } from '../../constants/colors.const';
import { consoleLogStore } from '../../stores/console/console-log.store';
import { ConsoleView } from '../console/console-view.component';
import { NetworkView } from '../network/network-view.component';
import { PerformanceView } from '../performance/performance-view.component';
import { IconButton } from '../ui/icon-button.ui';

/**
 * Everything inside the modal. Split out of `DevtoolsOverlay` so its store subscriptions only run
 * while the modal is actually open — `Modal` renders nothing when hidden, so this stays unmounted
 * and a chatty app doesn't re-render the FAB on every log line.
 */
export function DevtoolsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<DevtoolsTab>('network');
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
    /**
     * Keyboard avoidance has to live here, wrapping everything, rather than inside the tab that owns
     * the text input. `KeyboardAvoidingView` measures itself from `onLayout`, whose coordinates are
     * parent-relative — placed below the header and tab bar it reads its own bottom edge as ~120px
     * higher than it is and under-pads by exactly that, leaving the console prompt behind the
     * keyboard. As a direct child of the modal's SafeAreaView its measured bottom is the screen's.
     * Android gets an explicit behavior too: this renders inside a `Modal`, whose window doesn't
     * reliably inherit the activity's `adjustResize`.
     */
    <KeyboardAvoidingView
      style={styles.panel}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <PanelBrand />
        <IconButton name="close" color={COLORS.textSecondary} onPress={onClose} hitSlop={12} />
      </View>

      <DevtoolsTabBar tab={tab} onChange={setTab} badges={{ console: consoleErrorCount }} />

      <View style={styles.tabPanel}>{tabContent}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tabPanel: {
    flex: 1,
  },
  hiddenTabPanel: {
    display: 'none',
  },
});
