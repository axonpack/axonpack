import { useMemo, useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DevtoolsTabBar, type DevtoolsTab } from './devtools-tab-bar.component';
import { COLORS } from '../../constants/colors.const';
import { consoleLogStore } from '../../stores/console/console-log.store';
import { ConsoleView } from '../console/console-view.component';
import { NetworkView } from '../network/network-view.component';
import { AxonpackLogo } from '../ui/axonpack-logo.ui';
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

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <AxonpackLogo size={20} />
          <Text style={styles.headerTitle}>@axonpack/expo-devtools</Text>
        </View>
        <IconButton name="close" color={COLORS.textSecondary} onPress={onClose} hitSlop={12} />
      </View>

      <DevtoolsTabBar tab={tab} onChange={setTab} badges={{ console: consoleErrorCount }} />

      {/* Both views stay mounted and the inactive one is hidden, so switching tabs doesn't wipe the
          filters, panels, and scroll position you set up on the other one. */}
      <View style={[styles.tabPanel, tab !== 'network' && styles.hiddenTabPanel]}>
        <NetworkView />
      </View>
      <View style={[styles.tabPanel, tab !== 'console' && styles.hiddenTabPanel]}>
        <ConsoleView />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    // textTransform: 'uppercase',
  },
  tabPanel: {
    flex: 1,
  },
  hiddenTabPanel: {
    display: 'none',
  },
});
