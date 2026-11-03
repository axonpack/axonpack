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

export const TOPICS: AgentTopic[] = [];
