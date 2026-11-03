import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import {
  defineStorageAdapter,
  resolveStorageAdapters,
} from '../../services/define-adapter.service';
import { storageStore } from '../../stores/storage.store';
import { STORAGE_AGENT } from '../storage-agent.const';

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([STORAGE_AGENT], { topic: 'storage', ...rest });
const settle = () => new Promise((resolve) => setImmediate(resolve));

const VALUES: Record<string, string> = { theme: 'dark', token: 'abc' };
let reads: string[];

beforeEach(() => {
  reads = [];
  storageStore.reset();
  storageStore.setEnabled(true);
  storageStore.setAdapters(
    resolveStorageAdapters([
      defineStorageAdapter({
        name: 'Memory',
        getAllKeys: () => Object.keys(VALUES),
        getItem: (key: string) => {
          reads.push(key);
          return VALUES[key] ?? null;
        },
      }),
    ])
  );
});

describe('the storage topic', () => {
  it('lists the keys on the first ask and reads no value', async () => {
    expect(ask()).toBe('# wait: listing the keys of memory');
    await settle();
    expect(ask()).toBe(
      [
        '# storage · 2 of 2 match',
        'id\ttype\tvalue',
        'memory/theme\tunread\t-',
        'memory/token\tunread\t-',
        '# next: --after memory/theme',
      ].join('\n')
    );
    expect(reads).toEqual([]);
  });

  it('reads one value for get, and lists show it from then on', async () => {
    ask();
    await settle();
    expect(ask({ get: 'memory/theme' })).toBe('# wait: reading memory/theme');
    await settle();
    expect(JSON.parse(ask({ get: 'memory/theme', json: true }))).toMatchObject({
      key: 'theme',
      text: 'dark',
      kind: 'string',
    });
    expect(reads).toEqual(['theme']);
    expect(ask({ where: ['type=unread'], fields: 'id', json: true })).toBe('{"id":"memory/token"}');
  });

  it('says so when no store is registered', () => {
    storageStore.setAdapters([]);
    expect(ask()).toBe('# storage is off: no stores in config.storage.adapters');
  });
});
