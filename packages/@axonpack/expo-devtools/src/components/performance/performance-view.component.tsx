import { useEffect, useState, useSyncExternalStore } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IdleState } from './idle-state.component';
import { InteractionRow } from './interaction-row.component';
import { LimiterPanel } from './limiter-panel.component';
import { LongTaskRow } from './long-task-row.component';
import { ResourcesSection } from './resources-section.component';
import { StartupTimingSection } from './startup-timing.component';
import { UserTimingRow } from './user-timing-row.component';
import { COLORS } from '../../constants/colors.const';
import { startFpsMonitor } from '../../services/performance/fps-monitor.service';
import {
  performanceStore,
  type InteractionEntry,
  type LongTaskEntry,
  type UserTimingEntry,
} from '../../stores/performance/performance.store';
import { animateNextLayout } from '../../utils/layout-animation.util';
import { DevtoolsToolbar, ToolbarDivider } from '../devtools-toolbar.component';
import { Chip } from '../ui/chip.ui';
import { IconButton } from '../ui/icon-button.ui';
import { InsetPadding } from '../ui/inset-padding.ui';

type ListKey = 'longTasks' | 'userTiming' | 'interactions';

type ListRow =
  | { key: 'longTasks'; entry: LongTaskEntry }
  | { key: 'userTiming'; entry: UserTimingEntry }
  | { key: 'interactions'; entry: InteractionEntry };

/** Empty means two opposite things — nothing happened, or this device never reports it. */
const EMPTY_TEXT: Record<ListKey, { supported: string; unsupported: string }> = {
  longTasks: {
    supported: 'Nothing has blocked the JS thread yet.',
    unsupported: 'This device doesn&apos;t report long tasks.',
  },
  userTiming: {
    supported: 'No marks yet. Add devtools.mark() and devtools.measure() to your code.',
    unsupported: 'No marks yet. Add devtools.mark() and devtools.measure() to your code.',
  },
  interactions: {
    supported: 'No slow interactions yet.',
    unsupported: 'This device doesn&apos;t report interaction timing.',
  },
};
export function PerformanceView() {
  const { longTasks, userTiming, interactions, startup, support, dropped } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );
  const paused = useSyncExternalStore(performanceStore.subscribe, performanceStore.isPaused);
  const [list, setList] = useState<ListKey>('longTasks');
  const [limiterOpen, setLimiterOpen] = useState(false);

  useEffect(() => {
    if (paused) return;
    return startFpsMonitor();
  }, [paused]);

  const listSupported =
    list === 'longTasks'
      ? support.longTasks
      : list === 'interactions'
        ? support.interactions
        : true;
  const droppedForList =
    list === 'longTasks' ? dropped.longTasks : list === 'interactions' ? dropped.interactions : 0;

  // Paused *and* nothing collected yet: the tab has nothing to show and no history to preserve, so it
  // explains itself instead of presenting a screen of dashes. Paused with data still shows the data —
  // pausing freezes the readings, it doesn't discard them.
  const neverRecorded =
    longTasks.length === 0 && interactions.length === 0 && userTiming.length === 0;

  const rows: ListRow[] =
    list === 'longTasks'
      ? longTasks.map((entry) => ({ key: 'longTasks', entry }))
      : list === 'userTiming'
        ? userTiming.map((entry) => ({ key: 'userTiming', entry }))
        : interactions.map((entry) => ({ key: 'interactions', entry }));

  return (
    <View style={styles.container}>
      <DevtoolsToolbar
        paused={paused}
        onTogglePaused={() => performanceStore.setPaused(!paused)}
        onClear={performanceStore.clear}
        clearLabel="Clear recorded data">
        <ToolbarDivider />
        <IconButton
          name="speed"
          color={limiterOpen ? COLORS.accent : COLORS.textSecondary}
          active={limiterOpen}
          label="Limiter"
          onPress={() => {
            animateNextLayout();
            setLimiterOpen((current) => !current);
          }}
        />
      </DevtoolsToolbar>

      {limiterOpen && <LimiterPanel />}

      {paused && neverRecorded ? (
        <ScrollView>
          <IdleState />
          {/* Startup is measured once at launch, before recording could have been switched on, so it is
              the one section worth showing even here. */}
          <StartupTimingSection startup={startup} />
          {/* Same as the other tabs: the last row otherwise sits under the home indicator. */}
          <InsetPadding edge="bottom" />
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.entry.id}
          renderItem={({ item }) => {
            if (item.key === 'longTasks') return <LongTaskRow entry={item.entry} />;
            if (item.key === 'userTiming') return <UserTimingRow entry={item.entry} />;
            return <InteractionRow entry={item.entry} />;
          }}
          ListHeaderComponent={
            <View>
              <ResourcesSection />
              <StartupTimingSection startup={startup} />

              <View style={styles.selector}>
                <Chip
                  label={`Long tasks ${longTasks.length}`}
                  active={list === 'longTasks'}
                  onPress={() => setList('longTasks')}
                />
                <Chip
                  label={`User timing ${userTiming.length}`}
                  active={list === 'userTiming'}
                  onPress={() => setList('userTiming')}
                />
                <Chip
                  label={`Interactions ${interactions.length}`}
                  active={list === 'interactions'}
                  onPress={() => setList('interactions')}
                />
              </View>

              {list === 'longTasks' && longTasks.length > 0 ? (
                <Text style={styles.listNote}>
                  These show when the thread was stuck, not what stuck it. Wrap your own code in
                  devtools.mark() and devtools.measure() to find out.
                </Text>
              ) : null}
              {list === 'interactions' && interactions.length > 0 ? (
                <Text style={styles.listNote}>
                  Times are rounded to 8 ms, and anything under 16 ms isn&apos;t reported.
                </Text>
              ) : null}
              {/* The platform discards entries once its own buffer overflows, and only tells us the
                count — so this is the difference between "6 happened" and "6 of 40 survived". */}
              {droppedForList > 0 ? (
                <Text style={styles.listNote}>
                  {droppedForList} more happened before this list started keeping them.
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {listSupported ? EMPTY_TEXT[list].supported : EMPTY_TEXT[list].unsupported}
            </Text>
          }
          ListFooterComponent=<InsetPadding edge="bottom" />
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.sectionTint,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  listNote: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  empty: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    padding: 14,
  },
});
