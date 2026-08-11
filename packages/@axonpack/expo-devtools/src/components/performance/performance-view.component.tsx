import { useEffect, useState, useSyncExternalStore } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppSection } from './app-section.component';
import { DeviceSection } from './device-section.component';
import { IdleState } from './idle-state.component';
import { InteractionRow } from './interaction-row.component';
import { LimiterPanel } from './limiter-panel.component';
import { LongTaskRow } from './long-task-row.component';
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
import { Chip } from '../ui/chip.ui';
import { IconButton } from '../ui/icon-button.ui';
import { RecordToggleButton } from '../ui/record-toggle-button.ui';
import { animateNextLayout } from '../../utils/layout-animation.util';

type ListKey = 'longTasks' | 'userTiming' | 'interactions';

type ListRow =
  | { key: 'longTasks'; entry: LongTaskEntry }
  | { key: 'userTiming'; entry: UserTimingEntry }
  | { key: 'interactions'; entry: InteractionEntry };

/** Empty means two opposite things — nothing happened, or this device never reports it. */
const EMPTY_TEXT: Record<ListKey, { supported: string; unsupported: string }> = {
  longTasks: {
    supported: 'Nothing has blocked the JS thread yet.',
    unsupported: 'Long tasks are not available on this device.',
  },
  userTiming: {
    supported: 'No marks yet. Call devtools.mark() and devtools.measure() in your code.',
    unsupported: 'No marks yet. Call devtools.mark() and devtools.measure() in your code.',
  },
  interactions: {
    supported: 'No slow interactions yet.',
    unsupported: 'Interaction timing is not available on this device.',
  },
};
export function PerformanceView() {
  const { longTasks, userTiming, interactions, startup, support, dropped, systemMemory, storage } =
    useSyncExternalStore(performanceStore.subscribe, performanceStore.getSnapshot);
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
      <View style={styles.toolbar}>
        {/* Same order and glyphs as the network and console toolbars: record, then clear, then a
            divider before anything that opens a panel. */}
        <RecordToggleButton paused={paused} onToggle={() => performanceStore.setPaused(!paused)} />
        <IconButton
          name="block"
          color={COLORS.textSecondary}
          onPress={performanceStore.clear}
          label="Clear recorded data"
        />

        <View style={styles.toolbarDivider} />

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
      </View>

      {limiterOpen && <LimiterPanel />}

      {paused && neverRecorded ? (
        <ScrollView>
          <IdleState />
          {/* Startup is measured once at launch, before recording could have been switched on, so it is
              the one section worth showing even here. */}
          <StartupTimingSection startup={startup} />
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
              <AppSection />

              <DeviceSection
                latest={systemMemory.at(-1)}
                storage={storage}
                available={support.systemMemory}
              />
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
                  Shows when the thread was blocked, not by what. React Native reports no
                  attribution — wrap your own code in devtools.mark() and devtools.measure() to name
                  it.
                </Text>
              ) : null}
              {list === 'interactions' && interactions.length > 0 ? (
                <Text style={styles.listNote}>
                  Durations are rounded to the nearest 8 ms, and anything under 16 ms is never
                  reported.
                </Text>
              ) : null}
              {/* The platform discards entries once its own buffer overflows, and only tells us the
                count — so this is the difference between "6 happened" and "6 of 40 survived". */}
              {droppedForList > 0 ? (
                <Text style={styles.listNote}>
                  {droppedForList} more happened before this list could keep them.
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {listSupported ? EMPTY_TEXT[list].supported : EMPTY_TEXT[list].unsupported}
            </Text>
          }
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
  // Matches the network and console headers: buttons grouped from the left, no gap prop — the icon
  // buttons carry their own padding, and a spacer would push actions to opposite edges.
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: COLORS.toolbarBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  toolbarDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
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
