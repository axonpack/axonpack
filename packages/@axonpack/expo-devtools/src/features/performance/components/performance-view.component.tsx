import { useEffect, useState, useSyncExternalStore } from 'react';
import { ScrollView, View } from 'react-native';

import { EntryList } from './entry-list.component';
import { IdleState } from './idle-state.component';
import { ResourcesSection } from './resources-section.component';
import { SectionChips, type PerformanceSection } from './section-chips.component';
import { StartupTimingSection } from './startup-timing.component';
import { startFpsMonitor } from '../services/fps-monitor.service';
import { performanceStore } from '../stores/performance.store';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { DevtoolsToolbar, ToolbarDivider } from '../../../core/components/devtools-toolbar.component';
import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';

export function PerformanceView() {
  const styles = useStyles();
  const { longTasks, userTiming, interactions, startup } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );
  const paused = useSyncExternalStore(performanceStore.subscribe, performanceStore.isPaused);
  const [section, setSection] = useState<PerformanceSection>('statistics');

  useEffect(() => {
    if (paused) return;
    return startFpsMonitor();
  }, [paused]);

  const neverRecorded =
    longTasks.length === 0 && interactions.length === 0 && userTiming.length === 0;

  return (
    <View style={styles.container}>
      <DevtoolsToolbar
        paused={paused}
        onTogglePaused={() => performanceStore.setPaused(!paused)}
        onClear={performanceStore.clear}
        clearLabel="Clear recorded data">
        <ToolbarDivider />
        <SectionChips
          section={section}
          onChange={setSection}
          counts={{
            longTasks: longTasks.length,
            userTiming: userTiming.length,
            interactions: interactions.length,
          }}
        />
      </DevtoolsToolbar>

      {section === 'statistics' ? (
        <ScrollView>
          {paused && neverRecorded ? <IdleState /> : <ResourcesSection />}
          <StartupTimingSection startup={startup} />
          <InsetPadding edge="bottom" />
        </ScrollView>
      ) : (
        <EntryList list={section} />
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
}));
