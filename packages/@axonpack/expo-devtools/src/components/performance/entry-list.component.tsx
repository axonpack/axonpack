import { useSyncExternalStore } from 'react';
import { FlatList, Text, View, type ListRenderItemInfo } from 'react-native';

import { IdleState } from './idle-state.component';
import { InteractionRow } from './interaction-row.component';
import { LongTaskRow } from './long-task-row.component';
import type { PerformanceSection } from './section-chips.component';
import { UserTimingRow } from './user-timing-row.component';
import {
  performanceStore,
  type InteractionEntry,
  type LongTaskEntry,
  type UserTimingEntry,
} from '../../stores/performance/performance.store';
import { makeThemedStyles } from '../../utils/themed-styles.util';
import { InsetPadding } from '../ui/inset-padding.ui';

export type PerformanceListKey = Exclude<PerformanceSection, 'statistics' | 'limiter'>;

type ListRow =
  | { key: 'longTasks'; entry: LongTaskEntry }
  | { key: 'userTiming'; entry: UserTimingEntry }
  | { key: 'interactions'; entry: InteractionEntry };

const EMPTY_TEXT: Record<PerformanceListKey, { supported: string; unsupported: string }> = {
  longTasks: {
    supported: 'Nothing has blocked the JS thread yet.',
    unsupported: "This device doesn't report long tasks.",
  },
  userTiming: {
    supported: 'No marks yet. Add devtools.mark() and devtools.measure() to your code.',
    unsupported: 'No marks yet. Add devtools.mark() and devtools.measure() to your code.',
  },
  interactions: {
    supported: 'No slow interactions yet.',
    unsupported: "This device doesn't report interaction timing.",
  },
};

function keyExtractor(row: ListRow): string {
  return row.entry.id;
}

function renderRow({ item }: ListRenderItemInfo<ListRow>) {
  if (item.key === 'longTasks') return <LongTaskRow entry={item.entry} />;
  if (item.key === 'userTiming') return <UserTimingRow entry={item.entry} />;
  return <InteractionRow entry={item.entry} />;
}

export function EntryList({ list }: { list: PerformanceListKey }) {
  const styles = useStyles();
  const { longTasks, userTiming, interactions, support, dropped } = useSyncExternalStore(
    performanceStore.subscribe,
    performanceStore.getSnapshot
  );
  const paused = useSyncExternalStore(performanceStore.subscribe, performanceStore.isPaused);

  const supported =
    list === 'longTasks'
      ? support.longTasks
      : list === 'interactions'
        ? support.interactions
        : true;
  const droppedForList =
    list === 'longTasks' ? dropped.longTasks : list === 'interactions' ? dropped.interactions : 0;

  const rows: ListRow[] =
    list === 'longTasks'
      ? longTasks.map((entry) => ({ key: 'longTasks', entry }))
      : list === 'userTiming'
        ? userTiming.map((entry) => ({ key: 'userTiming', entry }))
        : interactions.map((entry) => ({ key: 'interactions', entry }));

  return (
    <FlatList
      data={rows}
      keyExtractor={keyExtractor}
      renderItem={renderRow}
      ListHeaderComponent={
        <View>
          {list === 'longTasks' && rows.length > 0 ? (
            <Text style={styles.listNote}>
              These show when the thread was stuck, not what stuck it. Wrap your own code in
              devtools.mark() and devtools.measure() to find out.
            </Text>
          ) : null}
          {list === 'interactions' && rows.length > 0 ? (
            <Text style={styles.listNote}>
              Times are rounded to 8 ms, and anything under 16 ms isn't reported.
            </Text>
          ) : null}
          {droppedForList > 0 ? (
            <Text style={styles.listNote}>
              {droppedForList} more happened before this list started keeping them.
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        paused ? (
          <IdleState startupBelow={false} />
        ) : (
          <Text style={styles.empty}>
            {supported ? EMPTY_TEXT[list].supported : EMPTY_TEXT[list].unsupported}
          </Text>
        )
      }
      ListFooterComponent=<InsetPadding edge="bottom" />
    />
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
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
}));
