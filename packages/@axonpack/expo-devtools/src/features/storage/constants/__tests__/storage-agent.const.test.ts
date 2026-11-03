import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import {
  defineStorageAdapter,
  resolveStorageAdapters,
} from '../../services/define-adapter.service';
import { configureStorageRedaction } from '../../services/redact-storage.service';
import { storageStore } from '../../stores/storage.store';
import { STORAGE_AGENT } from '../storage-agent.const';

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([STORAGE_AGENT], { topic: 'storage', ...rest }).text;
const settle = () => new Promise((resolve) => setImmediate(resolve));

/** Asks again after each `# wait:`, as the CLI does. */
async function answer(rest: Partial<AgentQuery> = {}) {
  for (let tries = 0; tries < 5; tries++) {
    const reply = ask(rest);
    if (!reply.startsWith('# wait: ')) return reply;
    await settle();
  }
  throw new Error('still waiting after 5 tries');
}

const VALUES: Record<string, string> = {
  a: 'one',
  b: 'two',
  c: 'three',
  secret: 's3cret',
  token: 'abc',
};
const ALL_KEYS = Object.keys(VALUES);
let reads: string[];
/** Keys the app writes after the first listing. */
let added: Record<string, string>;

beforeEach(() => {
  reads = [];
  added = {};
  configureStorageRedaction({});
  storageStore.reset();
  storageStore.setEnabled(true);
  storageStore.setAdapters(
    resolveStorageAdapters([
      defineStorageAdapter({
        name: 'Memory',
        getAllKeys: () => [...ALL_KEYS, ...Object.keys(added)],
        getItem: (key: string) => {
          reads.push(key);
          return VALUES[key] ?? added[key] ?? null;
        },
      }),
    ])
  );
});

describe('the storage topic', () => {
  it('lists the keys first, then reads only the values on the page it returns', async () => {
    expect(ask({ limit: 2 })).toBe('# wait: listing the keys of memory');
    await settle();
    expect(reads).toEqual([]);
    expect(ask({ limit: 2 })).toBe('# wait: reading 2 values');
    await settle();
    expect(ask({ limit: 2 })).toBe(
      [
        '# storage · 5 of 5 match · showing 2',
        'id\ttype\tvalue',
        'memory/a\tstring\tone',
        'memory/b\tstring\ttwo',
        '# next: --after memory/a',
        '# more: --before memory/b',
      ].join('\n')
    );
    expect(reads).toEqual(['a', 'b']);
    expect(await answer({ where: ['key=c,secret,token'], fields: 'id,type', json: true })).toBe(
      [
        '{"id":"memory/c","type":"string"}',
        '{"id":"memory/secret","type":"string"}',
        '{"id":"memory/token","type":"string"}',
      ].join('\n')
    );
    expect(reads).toEqual(['a', 'b', 'c', 'secret', 'token']);
  });

  it('lists the keys again for each new query, keeping the values it read', async () => {
    configureStorageRedaction({ keys: ['new'] });
    await answer({ limit: 2 });
    added = { new: 'hunter2', newer: 'four' };
    const query = { where: ['key~new'], fields: 'id,value', json: true };

    expect(ask(query)).toBe('# wait: listing the keys of memory');
    await settle();
    // Asked again while it waits, it carries on rather than listing again.
    expect(ask(query)).toBe('# wait: reading 2 values');
    await settle();
    expect(ask(query)).toBe(
      ['{"id":"memory/new","value":"[redacted]"}', '{"id":"memory/newer","value":"four"}'].join(
        '\n'
      )
    );
    expect(reads).toEqual(['a', 'b', 'new', 'newer']);
  });

  it.each([
    ['--grep', { grep: 'two' }],
    ['--where on value', { where: ['value~two'] }],
  ])('reads every key once for %s, then answers', async (_flag, search) => {
    await answer({ limit: 1 });
    expect(ask(search)).toBe('# wait: listing the keys of memory');
    await settle();
    expect(ask(search)).toBe('# wait: reading 4 values');
    // Asked again while the reads are in flight: nothing is read twice.
    expect(ask(search)).toBe('# wait: reading 4 values');
    await settle();
    expect(ask({ ...search, fields: 'id', json: true })).toBe('{"id":"memory/b"}');
    expect([...reads].sort()).toEqual(ALL_KEYS);
  });

  it('does not read again for a second search', async () => {
    await answer({ grep: 'two' });
    expect(reads).toHaveLength(ALL_KEYS.length);
    expect(await answer({ where: ['value~three'], fields: 'id', json: true })).toBe(
      '{"id":"memory/c"}'
    );
    expect(await answer({ grep: 'one', count: true })).toBe('1');
    expect(reads).toHaveLength(ALL_KEYS.length);
  });

  it('shows redacted values as [redacted] and never a hidden key', async () => {
    configureStorageRedaction({
      keys: ['token'],
      redact: (entry) => (entry.key === 'secret' ? null : entry),
    });
    // The page is a, b, c, secret; secret drops out once read, so token moves onto it and is read.
    expect(await answer({ limit: 4, fields: 'id,value', json: true })).toBe(
      [
        '{"id":"memory/a","value":"one"}',
        '{"id":"memory/b","value":"two"}',
        '{"id":"memory/c","value":"three"}',
        '{"id":"memory/token","value":"[redacted]"}',
      ].join('\n')
    );
    expect(await answer({ grep: 'abc', count: true })).toBe('0');
    expect(await answer({ grep: 's3cret', count: true })).toBe('0');
    expect(await answer({ get: 'memory/secret' })).toMatch(
      /^error: no storage row "memory\/secret"/
    );
  });

  it('reads one value for get', async () => {
    ask();
    await settle();
    expect(ask({ get: 'memory/b' })).toBe('# wait: reading 1 value');
    await settle();
    expect(JSON.parse(ask({ get: 'memory/b', json: true }))).toMatchObject({
      key: 'b',
      text: 'two',
      kind: 'string',
    });
    expect(reads).toEqual(['b']);
  });

  it('says so when no store is registered', () => {
    storageStore.setAdapters([]);
    expect(ask()).toBe('# storage is off: no stores in config.storage.adapters');
  });
});
