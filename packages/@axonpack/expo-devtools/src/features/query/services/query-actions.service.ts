import {
  forcedQueries,
  queryStore,
  type ForcedQueryState,
  type QueryLike,
} from '../stores/query.store';

function exactFilter(query: QueryLike) {
  return { queryKey: query.queryKey, exact: true };
}

/**
 * Puts back the state a forced loading or error replaced. Every other action calls this first: a
 * query held in a fake fetch would hand a refetch the old finished promise and never really fetch.
 */
function release(query: QueryLike) {
  const forced = forcedQueries.get(query);
  if (!forced) return;
  forcedQueries.delete(query);
  query.setState(forced.saved);
}

function client() {
  return queryStore.getState().client;
}

export function refetchQuery(query: QueryLike) {
  release(query);
  // TanStack Query reports a failed fetch on the query itself, so there is nothing to catch here.
  client()?.refetchQueries(exactFilter(query));
}

export function invalidateQuery(query: QueryLike) {
  release(query);
  client()?.invalidateQueries(exactFilter(query));
}

export function resetQuery(query: QueryLike) {
  release(query);
  client()?.resetQueries(exactFilter(query));
}

export function removeQuery(query: QueryLike) {
  forcedQueries.delete(query);
  client()?.removeQueries(exactFilter(query));
}

/**
 * Pressing the same one again puts the query back as it was. The saved state can be older than
 * what a real fetch wrote in between; the toggle restores it anyway, which is what "undo" means
 * on screen.
 */
export function toggleForcedState(query: QueryLike, kind: ForcedQueryState) {
  const wasForced = forcedQueries.get(query)?.kind;
  release(query);
  if (wasForced === kind) return;

  const saved = query.state;
  // Registered before `setState`, which is what notifies the tab: the row has to read it as forced.
  forcedQueries.set(query, { kind, saved });
  query.setState(
    kind === 'loading'
      ? // `fetching` as well as `pending`: v5's `isLoading` is both, and a screen reading it would
        // otherwise not change.
        { status: 'pending', fetchStatus: 'fetching', data: undefined, error: null }
      : { status: 'error', fetchStatus: 'idle', error: new Error('Error forced from devtools') }
  );
}
