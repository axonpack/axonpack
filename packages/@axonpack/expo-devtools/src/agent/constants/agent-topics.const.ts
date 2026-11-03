import { CONSOLE_AGENT } from '../../features/console/constants/console-agent.const';
import { CRASH_AGENT } from '../../features/crash/constants/crash-agent.const';
import { NAVIGATION_AGENT } from '../../features/navigation/constants/navigation-agent.const';
import { NETWORK_AGENT } from '../../features/network/constants/network-agent.const';
import { PERFORMANCE_AGENT } from '../../features/performance/constants/performance-agent.const';
import { QUERY_AGENT } from '../../features/query/constants/query-agent.const';
import { REDUX_AGENT } from '../../features/redux/constants/redux-agent.const';
import { STORAGE_AGENT } from '../../features/storage/constants/storage-agent.const';
import type { AgentQuery } from '../utils/run-query.util';

type FieldGetter<T> = (row: T) => unknown;

/**
 * One feature as the agent CLI sees it. A feature adds one of these in
 * `features/<f>/constants/<f>-agent.const.ts` and one line in `TOPICS`, and every operation in
 * `run-query.util.ts` then works on it with no query code of its own.
 */
export type AgentTopic<T = any> = {
  name: string;
  /** One line for `devtools topics`. */
  about: string;
  /**
   * Newest first, as every store here keeps them; paging reads arrival order from this. Read from
   * the store, which has already redacted on write, never from a raw source.
   */
  rows: () => readonly T[];
  /** False when the app turned the feature off, so a query says so rather than "0 match". */
  enabled?: () => boolean;
  /** Why it is off, in one line, when `enabled` says so. */
  off?: string;
  /**
   * Runs before the query. A topic whose store fills by an async read (the reply itself is sync)
   * starts that read here and returns what it is waiting for; the reply is then `# wait: <that>`
   * and the CLI asks again.
   */
  prepare?: (query: AgentQuery) => string | undefined;
  /** `id` is what `get` and the cursors look up, and `t` (epoch ms) is what `since` reads. */
  fields: { id: (row: T) => string; t: (row: T) => number | undefined } & Record<
    string,
    FieldGetter<T>
  >;
  /** The columns a list shows when the query names none. */
  show: string[];
  /** A row still in flight. The `next` cursor stops before it, so the next poll sees how it ended. */
  pending?: (row: T) => boolean;
};

export const TOPICS: AgentTopic[] = [
  NETWORK_AGENT,
  CONSOLE_AGENT,
  PERFORMANCE_AGENT,
  STORAGE_AGENT,
  QUERY_AGENT,
  NAVIGATION_AGENT,
  REDUX_AGENT,
  CRASH_AGENT,
];
