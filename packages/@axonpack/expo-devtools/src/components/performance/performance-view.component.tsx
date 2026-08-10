import { useEffect, useState, useSyncExternalStore } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { InteractionRow } from './interaction-row.component';
import { LongTaskRow } from './long-task-row.component';
import { MetricCard } from './metric-card.component';
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
import { formatSize } from '../../utils/format-bytes.util';
import { formatMs, getFpsColor } from '../../utils/performance/format-metrics.util';
import { Chip } from '../ui/chip.ui';
import { IconButton } from '../ui/icon-button.ui';
import { RecordToggleButton } from '../ui/record-toggle-button.ui';
import { Sparkline } from '../ui/sparkline.ui';

type ListKey = 'longTasks' | 'userTiming' | 'interactions';

type ListRow =
  | { key: 'longTasks'; entry: LongTaskEntry }
  | { key: 'userTiming'; entry: UserTimingEntry }
  | { key: 'interactions'; entry: InteractionEntry };

const EMPTY_TEXT: Record<ListKey, string> = {
  longTasks:
    "No long tasks recorded — either nothing blocked the JS thread past the threshold, or this platform doesn't report the longtask entry type at all.",
  userTiming:
    'No marks or measures yet. Call performance.mark() and performance.measure() in your own code and they show up here.',
  interactions:
    "No slow interactions recorded — either everything finished under the threshold, or this platform doesn't report the event entry type.",
};

export function PerformanceView() {
  const { memory, longTasks, userTiming, interactions, startup, fps } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );
  const paused = useSyncExternalStore(performanceStore.subscribe, performanceStore.isPaused);
  // One list at a time rather than three stacked: nesting scrollables inside a scrollable breaks
  // both of them, and only one of these is ever the question being asked.
  const [list, setList] = useState<ListKey>('longTasks');

  /**
   * The rAF loop lives here rather than in `init()` on purpose: it keeps the JS thread awake for as
   * long as it runs. `DevtoolsPanel` unmounts this tab when you switch away, so it stops then — the
   * other collectors are cheap and keep running, so their history survives the panel closing.
   */
  useEffect(() => {
    if (paused) return;
    return startFpsMonitor();
  }, [paused]);

  const latest = memory.at(-1);
  const usedSeries = memory
    .map((sample) => sample.usedJSHeapSize)
    .filter((value): value is number => value !== undefined);
  const worstInteraction = interactions.reduce<number | undefined>(
    (worst, entry) => (worst === undefined || entry.duration > worst ? entry.duration : worst),
    undefined
  );

  const rows: ListRow[] =
    list === 'longTasks'
      ? longTasks.map((entry) => ({ key: 'longTasks', entry }))
      : list === 'userTiming'
        ? userTiming.map((entry) => ({ key: 'userTiming', entry }))
        : interactions.map((entry) => ({ key: 'interactions', entry }));

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <RecordToggleButton paused={paused} onToggle={() => performanceStore.setPaused(!paused)} />
        <View style={styles.toolbarSpacer} />
        <IconButton
          name="delete-outline"
          color={COLORS.textSecondary}
          onPress={() => performanceStore.clear()}
          hitSlop={8}
        />
      </View>

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
            <View style={styles.cards}>
              <MetricCard
                label="JS heap"
                value={formatSize(latest?.usedJSHeapSize)}
                hint={
                  latest?.totalJSHeapSize !== undefined
                    ? `of ${formatSize(latest.totalJSHeapSize)} allocated`
                    : 'Not reported by this JS engine'
                }>
                {usedSeries.length > 1 ? <Sparkline values={usedSeries} /> : null}
              </MetricCard>

              <MetricCard
                label="JS thread FPS"
                value={fps !== undefined ? String(fps) : '–'}
                valueColor={getFpsColor(fps)}
                hint="JS thread only — native UI jank is on another thread"
              />

              <MetricCard
                label="Worst interaction"
                value={formatMs(worstInteraction)}
                hint="Event to next paint, across everything recorded"
              />
            </View>

            {/* Hermes reports no heap-size limit, so there is deliberately no "% of limit" gauge —
                showing one would mean inventing the denominator. */}
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

            {/* RN's PerformanceLongTaskTiming returns a permanently empty `attribution` array — the
                web API's mechanism for naming the responsible code — so a long task says when and
                for how long, never by what. User timing is how you attribute it yourself. */}
            {list === 'longTasks' && longTasks.length > 0 ? (
              <Text style={styles.listNote}>
                Each row is a stretch where the JS thread couldn&apos;t do anything else. React
                Native reports no attribution, so to name the code responsible, wrap it in
                performance.mark/measure and read it under User timing.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{EMPTY_TEXT[list]}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.toolbarBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  toolbarSpacer: {
    flex: 1,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
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
