import { notifyManager, QueryClient } from '@tanstack/query-core';

import { queryStore, type QueryClientLike } from '../../stores/query.store';
import {
  invalidateQuery,
  refetchQuery,
  removeQuery,
  resetQuery,
  toggleForcedState,
} from '../query-actions.service';

// TanStack batches cache events onto a timer; running them inline keeps every assertion synchronous.
notifyManager.setScheduler((callback) => callback());

const KEY = ['todos'];

let client: QueryClient;
let stopWatching: () => void;
let queryFn: jest.Mock;

async function seed() {
  queryFn = jest.fn(async () => ['first']);
  await client.fetchQuery({ queryKey: KEY, queryFn });
}

function query() {
  const found = client.getQueryCache().find({ queryKey: KEY, exact: true });
  if (!found) throw new Error('query missing');
  return found;
}

function row() {
  return queryStore.getQueries().find((current) => current.hash === '["todos"]');
}

beforeEach(async () => {
  // No garbage collection timers, which would outlive the test and keep jest from exiting.
  client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  // Typed against the real client, so a change in TanStack's shape fails `check-types` here.
  const like: QueryClientLike = client;
  queryStore.setClient(like);
  stopWatching = queryStore.watch();
  await seed();
});

afterEach(() => {
  stopWatching();
  client.clear();
});

describe('watching the cache', () => {
  it('lists a query with its key, status and data', () => {
    expect(row()).toMatchObject({ status: 'success', data: ['first'], observers: 0 });
    expect(row()!.updatedAt).toBeGreaterThan(0);
  });

  it('follows a change to the data', () => {
    client.setQueryData(KEY, ['second']);
    expect(row()?.data).toEqual(['second']);
  });

  it('lists mutations', async () => {
    const mutation = client
      .getMutationCache()
      .build(client, { mutationKey: ['add'], mutationFn: async (text: string) => text.length });
    await mutation.execute('hello');
    expect(queryStore.getMutations()).toEqual([
      expect.objectContaining({ key: ['add'], status: 'success', variables: 'hello', data: 5 }),
    ]);
  });

  it('stops following once unwatched', () => {
    stopWatching();
    client.setQueryData(KEY, ['second']);
    expect(row()?.data).toEqual(['first']);
  });
});

describe('actions', () => {
  it('refetch runs the query function again', async () => {
    refetchQuery(query());
    await client.getQueryCache().find({ queryKey: KEY })?.promise;
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('invalidate marks the query stale', () => {
    invalidateQuery(query());
    expect(query().state.isInvalidated).toBe(true);
    expect(row()?.stale).toBe(true);
  });

  it('reset drops the data', () => {
    resetQuery(query());
    expect(row()).toMatchObject({ status: 'pending', data: undefined });
  });

  it('remove takes it out of the cache', () => {
    removeQuery(query());
    expect(row()).toBeUndefined();
  });
});

describe('forced states', () => {
  it('holds a query in loading and gives the data back on the second press', () => {
    toggleForcedState(query(), 'loading');
    expect(row()).toMatchObject({
      status: 'pending',
      fetchStatus: 'fetching',
      data: undefined,
      forced: 'loading',
    });

    toggleForcedState(query(), 'loading');
    expect(row()).toMatchObject({
      status: 'success',
      fetchStatus: 'idle',
      data: ['first'],
      forced: null,
    });
  });

  it('switches from loading to error without losing the real state', () => {
    toggleForcedState(query(), 'loading');
    toggleForcedState(query(), 'error');
    expect(row()).toMatchObject({ status: 'error', forced: 'error' });
    expect(row()?.error).toBeInstanceOf(Error);

    toggleForcedState(query(), 'error');
    expect(row()).toMatchObject({ status: 'success', data: ['first'], forced: null });
  });

  it('lets a refetch through a forced loading state', async () => {
    toggleForcedState(query(), 'loading');
    refetchQuery(query());
    await query().promise;
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(row()).toMatchObject({ status: 'success', forced: null });
  });
});
