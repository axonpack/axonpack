import { createAxonStore } from '../../../core/stores/axon.store';

/**
 * The parts of TanStack Query's `QueryClient` the tab uses, typed by shape so this package never
 * imports it. The example app hands a real v5 client to this type, which is what keeps it honest.
 */
export type QueryStateLike = {
  status: string;
  fetchStatus: string;
  data: unknown;
  error: unknown;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
};

export type QueryLike = {
  queryKey: readonly unknown[];
  queryHash: string;
  state: QueryStateLike;
  getObserversCount(): number;
  isStale(): boolean;
  setState(state: Partial<QueryStateLike>): void;
};

export type MutationLike = {
  mutationId: number;
  options: { mutationKey?: readonly unknown[] };
  state: {
    status: string;
    data: unknown;
    error: unknown;
    variables: unknown;
    submittedAt: number;
  };
};

type CacheLike<T> = {
  getAll(): T[];
  subscribe(listener: () => void): () => void;
};

type ExactQueryFilter = { queryKey: readonly unknown[]; exact: boolean };

export type QueryClientLike = {
  getQueryCache(): CacheLike<QueryLike>;
  getMutationCache(): CacheLike<MutationLike>;
  refetchQueries(filters: ExactQueryFilter): Promise<unknown>;
  invalidateQueries(filters: ExactQueryFilter): Promise<unknown>;
  resetQueries(filters: ExactQueryFilter): Promise<unknown>;
  removeQueries(filters: ExactQueryFilter): void;
};

export type ForcedQueryState = 'loading' | 'error';

export type QueryRow = {
  hash: string;
  query: QueryLike;
  status: string;
  fetchStatus: string;
  /** The later of the last data and the last error, or 0 when neither has arrived yet. */
  updatedAt: number;
  observers: number;
  stale: boolean;
  data: unknown;
  error: unknown;
  forced: ForcedQueryState | null;
};

export type MutationRow = {
  id: number;
  key: readonly unknown[] | undefined;
  status: string;
  submittedAt: number;
  variables: unknown;
  data: unknown;
  error: unknown;
};

/**
 * What a forced state replaced, so the toggle can put it back. Keyed by the query object, so a
 * removed query takes its entry with it.
 */
export const forcedQueries = new WeakMap<
  QueryLike,
  { kind: ForcedQueryState; saved: QueryStateLike }
>();

function toQueryRow(query: QueryLike): QueryRow {
  const { state } = query;
  return {
    hash: query.queryHash,
    query,
    status: state.status,
    fetchStatus: state.fetchStatus,
    updatedAt: Math.max(state.dataUpdatedAt, state.errorUpdatedAt),
    observers: query.getObserversCount(),
    stale: query.isStale(),
    data: state.data,
    error: state.error,
    forced: forcedQueries.get(query)?.kind ?? null,
  };
}

function toMutationRow(mutation: MutationLike): MutationRow {
  const { state } = mutation;
  return {
    id: mutation.mutationId,
    key: mutation.options.mutationKey,
    status: state.status,
    submittedAt: state.submittedAt,
    variables: state.variables,
    data: state.data,
    error: state.error,
  };
}

type QueryStoreState = {
  client: QueryClientLike | null;
  queries: QueryRow[];
  mutations: MutationRow[];
};

const initial: QueryStoreState = { client: null, queries: [], mutations: [] };

export const queryStore = createAxonStore(initial, (set, get) => ({
  setClient: (client: QueryClientLike | null) => set({ client, queries: [], mutations: [] }),
  hasClient: () => get().client !== null,
  getQueries: () => get().queries,
  getMutations: () => get().mutations,
  /**
   * Snapshots both caches now and on every change, until the returned function is called. Only the
   * open tab watches: TanStack Query fires a cache event for every fetch, and a closed panel has no
   * reason to pay for each one.
   */
  watch: (): (() => void) => {
    const { client } = get();
    if (!client) return () => {};
    const queryCache = client.getQueryCache();
    const mutationCache = client.getMutationCache();
    const refresh = () =>
      set({
        queries: queryCache.getAll().map(toQueryRow),
        mutations: mutationCache.getAll().map(toMutationRow),
      });
    refresh();
    const stopQueries = queryCache.subscribe(refresh);
    const stopMutations = mutationCache.subscribe(refresh);
    return () => {
      stopQueries();
      stopMutations();
    };
  },
}));

export const useQueryStore = queryStore.useStore;
