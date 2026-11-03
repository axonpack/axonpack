import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { queryStore } from '../stores/query.store';
import { queryStatusLabel, toJsonValue } from '../utils/format-query.util';

type QueryAgentRow = {
  id: string;
  t?: number;
  type: 'query' | 'mutation';
  /** A mutation's key. A query's key is its id. */
  key?: readonly unknown[];
  status: string;
  observers?: number;
  variables?: unknown;
  data: unknown;
  error: unknown;
};

/** Both caches, the one touched last first. A refetch moves a query up, so `--after` sees it. */
function rows(): QueryAgentRow[] {
  // The store keeps its rows in step only while the Query tab watches, so take a fresh snapshot.
  queryStore.watch()();
  const queries = queryStore.getQueries().map((row): QueryAgentRow => ({
    id: row.hash,
    t: row.updatedAt || undefined,
    type: 'query',
    status: queryStatusLabel(row),
    observers: row.observers,
    data: row.data,
    // An Error is `{}` to JSON.stringify.
    error: row.error == null ? undefined : toJsonValue(row.error),
  }));
  const mutations = queryStore.getMutations().map((row): QueryAgentRow => ({
    id: `mutation-${row.id}`,
    t: row.submittedAt || undefined,
    type: 'mutation',
    key: row.key,
    status: row.status,
    variables: row.variables,
    data: row.data,
    error: row.error == null ? undefined : toJsonValue(row.error),
  }));
  return [...queries, ...mutations].sort((a, b) => (b.t ?? 0) - (a.t ?? 0));
}

export const QUERY_AGENT: AgentTopic<QueryAgentRow> = {
  name: 'query',
  about: 'TanStack Query cache: queries (id is the query hash) and mutations, last updated first',
  rows,
  enabled: queryStore.hasClient,
  off: 'no QueryClient in config.query.client',
  fields: {
    id: (r) => r.id,
    t: (r) => r.t,
    type: (r) => r.type,
    key: (r) => r.key,
    status: (r) => r.status,
    observers: (r) => r.observers,
    variables: (r) => r.variables,
    data: (r) => r.data,
    error: (r) => r.error,
  },
  show: ['id', 'type', 'status', 'observers', 'error'],
};
