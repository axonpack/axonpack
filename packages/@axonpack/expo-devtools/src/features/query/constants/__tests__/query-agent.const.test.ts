import { notifyManager, QueryClient } from '@tanstack/query-core';

import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import { queryStore, type QueryClientLike } from '../../stores/query.store';
import { QUERY_AGENT } from '../query-agent.const';

// TanStack batches cache events onto a timer; running them inline keeps every assertion synchronous.
notifyManager.setScheduler((callback) => callback());

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([QUERY_AGENT], { topic: 'query', ...rest });

let client: QueryClient;
let clock = 1_000_000;

beforeEach(async () => {
  jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
  client = new QueryClient();
  queryStore.setClient(client as unknown as QueryClientLike);
  await client.fetchQuery({ queryKey: ['todos'], queryFn: async () => ['milk'] });
  await client
    .fetchQuery({
      queryKey: ['user'],
      queryFn: async () => {
        throw new Error('401 Unauthorized');
      },
      retry: false,
    })
    .catch(() => {});
});

afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
});

describe('the query topic', () => {
  it('lists the cache, last updated first, in the default columns', () => {
    expect(ask()).toBe(
      [
        '# query · 2 of 2 match',
        'id\ttype\tstatus\tobservers\terror',
        '["user"]\tquery\terror\t0\tError: 401 Unauthorized',
        '["todos"]\tquery\tinactive\t0\t-',
        '# next: --after ["user"]',
      ].join('\n')
    );
  });

  it('filters on status', () => {
    expect(ask({ where: ['status=error'], fields: 'id', json: true })).toBe(
      '{"id":"[\\"user\\"]"}'
    );
  });

  it('gets a query with its data', () => {
    expect(JSON.parse(ask({ get: '["todos"]', json: true }))).toMatchObject({
      type: 'query',
      data: ['milk'],
    });
  });

  it('says so when no client was passed', () => {
    queryStore.setClient(null);
    expect(ask()).toBe('# query is off: no QueryClient in config.query.client');
  });
});
