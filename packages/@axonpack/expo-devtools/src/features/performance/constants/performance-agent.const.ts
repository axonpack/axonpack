import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import {
  performanceStore,
  type InteractionEntry,
  type LongTaskEntry,
  type UserTimingEntry,
} from '../stores/performance.store';

type PerformanceAgentRow =
  | (LongTaskEntry & { kind: 'longtask' })
  | UserTimingEntry
  | (InteractionEntry & { kind: 'interaction' });

/** The three event lists as one, newest first. Samples (heap, CPU, FPS) have no id, so not here. */
function rows(): PerformanceAgentRow[] {
  const { longTasks, userTiming, interactions } = performanceStore.getSnapshot();
  const merged: PerformanceAgentRow[] = [
    ...longTasks.map((entry) => ({ ...entry, kind: 'longtask' as const })),
    ...userTiming,
    ...interactions.map((entry) => ({ ...entry, kind: 'interaction' as const })),
  ];
  return merged.sort((a, b) => b.timestamp - a.timestamp);
}

export const PERFORMANCE_AGENT: AgentTopic<PerformanceAgentRow> = {
  name: 'performance',
  about:
    'long tasks, slow interactions, marks and measures, newest first. Kept only while the Performance tab records, and it starts paused',
  rows,
  enabled: performanceStore.isEnabled,
  fields: {
    id: (e) => e.id,
    t: (e) => e.timestamp,
    kind: (e) => e.kind,
    name: (e) => e.name,
    ms: (e) => e.duration,
    handler: (e) => (e.kind === 'interaction' ? e.processingDuration : undefined),
    detail: (e) => (e.kind === 'mark' || e.kind === 'measure' ? e.detail : undefined),
  },
  show: ['id', 'kind', 'name', 'ms'],
  empty: () =>
    performanceStore.isPaused()
      ? 'paused: the Performance tab records only after record is pressed'
      : undefined,
};
