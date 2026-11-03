import { maskNetworkEntryForAgent } from '../../../features/network/services/redact-network.service';
import type {
  NetworkEntry,
  NetworkLogEntry,
  WebSocketLogEntry,
} from '../../../features/network/stores/network-log.store';
import type { AgentTopic } from '../../constants/agent-topics.const';
import { runQuery, type AgentQuery } from '../run-query.util';

type Row = {
  id: string;
  t: number;
  method: string;
  code?: number;
  ms?: number;
  url: string;
  body?: string;
  headers?: Record<string, string>;
};

const NOW = Date.now();
const MIN = 60_000;

// Newest first, as every store keeps them. r5 is still in flight.
const ROWS: Row[] = [
  {
    id: 'r6',
    t: NOW - MIN,
    method: 'GET',
    code: 500,
    ms: 900,
    url: 'https://api.test/v2/feed',
    body: 'Internal timeout',
  },
  { id: 'r5', t: NOW - 2 * MIN, method: 'POST', url: 'https://api.test/v1/upload' },
  {
    id: 'r4',
    t: NOW - 5 * MIN,
    method: 'POST',
    code: 401,
    ms: 184,
    url: 'https://api.test/v1/session/refresh',
    headers: { 'x-request-id': 'abc-123' },
  },
  {
    id: 'r3',
    t: NOW - 20 * MIN,
    method: 'GET',
    code: 200,
    ms: 50,
    url: 'https://cdn.test/a.png',
    body: 'x'.repeat(5000),
  },
  {
    id: 'r2',
    t: NOW - 30 * MIN,
    method: 'DELETE',
    code: 204,
    ms: 70,
    url: 'https://api.test/v1/item/7',
  },
  {
    id: 'r1',
    t: NOW - 120 * MIN,
    method: 'GET',
    code: 200,
    ms: 120,
    url: 'https://api.test/v1/me',
    body: 'line1\nline2\tend',
  },
];

const NET: AgentTopic<Row> = {
  name: 'net',
  about: 'fake requests',
  rows: () => ROWS,
  fields: {
    id: (r) => r.id,
    t: (r) => r.t,
    method: (r) => r.method,
    code: (r) => r.code,
    ms: (r) => r.ms,
    url: (r) => r.url,
    body: (r) => r.body,
  },
  show: ['id', 'method', 'code', 'ms', 'url'],
  pending: (r) => r.code === undefined,
};

const query = (rest: Partial<AgentQuery>) => runQuery([NET], { topic: 'net', ...rest });

/** The first column of each data row, skipping `#` lines and the header. */
const ids = (text: string) =>
  text
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .slice(1)
    .map((line) => line.split('\t')[0]);

describe('runQuery filters, windows and order', () => {
  it.each<[string, Partial<AgentQuery>, string[]]>([
    ['everything, newest first', {}, ['r6', 'r5', 'r4', 'r3', 'r2', 'r1']],
    ['grep, case-insensitive, in a body', { grep: 'TIMEOUT' }, ['r6']],
    ['grep a nested value', { grep: 'abc-123' }, ['r4']],
    ['grep across a newline', { grep: 'line2' }, ['r1']],
    ['grep a regex', { grep: '/v\\d\\/item/' }, ['r2']],
    ['grep a regex with flags', { grep: '/FEED/i' }, ['r6']],
    ['where =', { where: ['method=GET'] }, ['r6', 'r3', 'r1']],
    ['where = on a number', { where: ['code=401'] }, ['r4']],
    ['where = any-of, case-insensitive', { where: ['method=post,delete'] }, ['r5', 'r4', 'r2']],
    ['where !=', { where: ['method!=GET'] }, ['r5', 'r4', 'r2']],
    ['where >=', { where: ['code>=400'] }, ['r6', 'r4']],
    ['where >', { where: ['code>401'] }, ['r6']],
    ['where <', { where: ['code<300'] }, ['r3', 'r2', 'r1']],
    ['where <=', { where: ['code<=200'] }, ['r3', 'r1']],
    ['where ~ contains', { where: ['url~CDN'] }, ['r3']],
    ['where ~ any-of', { where: ['url~cdn,upload'] }, ['r5', 'r3']],
    ['where ~ regex', { where: ['url~/v1/'] }, ['r5', 'r4', 'r2', 'r1']],
    ['where ~ regex keeps its own comma', { where: ['url~/v\\d{1,2}\\/me/'] }, ['r1']],
    ['where !~', { where: ['url!~api'] }, ['r3']],
    ['where field?', { where: ['code?'] }, ['r6', 'r4', 'r3', 'r2', 'r1']],
    ['repeated where is AND', { where: ['method=GET', 'code>=300'] }, ['r6']],
    ['since, relative', { since: '10m' }, ['r6', 'r5', 'r4']],
    ['until, relative', { until: '10m' }, ['r3', 'r2', 'r1']],
    ['since, ISO', { since: new Date(NOW - 25 * MIN).toISOString() }, ['r6', 'r5', 'r4', 'r3']],
    ['limit', { limit: 2 }, ['r6', 'r5']],
    ['after reads forward from the cursor', { after: 'r4' }, ['r5', 'r6']],
    ['after takes the rows closest to it', { after: 'r1', limit: 2 }, ['r2', 'r3']],
    ['before', { before: 'r4' }, ['r3', 'r2', 'r1']],
    ['after and before together', { after: 'r2', before: 'r5' }, ['r3', 'r4']],
    ['sort ascending, empty last', { sort: 'ms' }, ['r3', 'r2', 'r1', 'r4', 'r6', 'r5']],
    ['sort descending, empty last', { sort: '-ms' }, ['r6', 'r4', 'r1', 'r2', 'r3', 'r5']],
    ['sort text', { sort: 'url' }, ['r2', 'r1', 'r4', 'r5', 'r6', 'r3']],
    ['sort then limit', { sort: '-ms', limit: 1 }, ['r6']],
  ])('%s', (_label, rest, expected) => {
    expect(ids(query(rest))).toEqual(expected);
  });
});

describe('runQuery output', () => {
  it('writes TSV under a summary, with a next cursor that stops before a row in flight', () => {
    expect(query({})).toBe(
      [
        '# net · 6 of 6 match',
        'id\tmethod\tcode\tms\turl',
        'r6\tGET\t500\t900\thttps://api.test/v2/feed',
        'r5\tPOST\t-\t-\thttps://api.test/v1/upload',
        'r4\tPOST\t401\t184\thttps://api.test/v1/session/refresh',
        'r3\tGET\t200\t50\thttps://cdn.test/a.png',
        'r2\tDELETE\t204\t70\thttps://api.test/v1/item/7',
        'r1\tGET\t200\t120\thttps://api.test/v1/me',
        '# next: --after r4',
      ].join('\n')
    );
  });

  it('says how many it shows and where the older rows go on', () => {
    const text = query({ limit: 2 }).split('\n');
    expect(text[0]).toBe('# net · 6 of 6 match · showing 2');
    expect(text.slice(-2)).toEqual(['# next: --after r4', '# more: --before r5']);
  });

  it('moves next to the newest row when nothing is in flight', () => {
    expect(query({ after: 'r5' }).split('\n').pop()).toBe('# next: --after r6');
  });

  it('keeps next on the cursor while the row after it is in flight', () => {
    expect(query({ after: 'r4' }).split('\n').pop()).toBe('# next: --after r4');
  });

  it.each<[string, Partial<AgentQuery>]>([
    ['from a cursor', { after: 'r4', where: ['code>=400'] }],
    ['newest first', { where: ['code>=500'] }],
  ])('holds next for a row in flight that the filter dropped, %s', (_label, rest) => {
    const text = query(rest);
    expect(ids(text)).toEqual(['r6']);
    expect(text.split('\n').pop()).toBe('# next: --after r4');
  });

  it('gives a cursor to poll from even when nothing matched', () => {
    expect(query({ where: ['code=418'] })).toBe(
      ['# net · 0 of 6 match', 'id\tmethod\tcode\tms\turl', '# next: --after r4'].join('\n')
    );
  });

  it('gives no cursor for a sorted list', () => {
    expect(query({ sort: '-ms' })).not.toContain('# next');
  });

  it('picks columns, prints t as ISO, and escapes tabs and newlines', () => {
    expect(query({ fields: 'id,t,body', where: ['id=r1'] })).toBe(
      [
        '# net · 1 of 6 match',
        'id\tt\tbody',
        `r1\t${new Date(NOW - 120 * MIN).toISOString()}\tline1\\nline2\\tend`,
        '# next: --after r1',
      ].join('\n')
    );
  });

  it('cuts long values at 2 KB unless full', () => {
    const cut = `${'x'.repeat(2048)}... [cut at 2048 of 5000 chars, --full for all]`;
    expect(ids(query({ fields: 'body,id', where: ['id=r3'] }))).toEqual([cut]);
    expect(ids(query({ fields: 'body', where: ['id=r3'], full: true }))).toEqual([
      'x'.repeat(5000),
    ]);
  });

  it('counts', () => {
    expect(query({ count: true, where: ['code>=400'] })).toBe('2');
  });

  it('groups by a field, most first', () => {
    expect(query({ groupBy: 'method' })).toBe(
      [
        '# net · 6 of 6 match · 3 values of method',
        'method\tcount',
        'GET\t3',
        'POST\t2',
        'DELETE\t1',
      ].join('\n')
    );
    expect(query({ groupBy: 'code', where: ['method=POST'], json: true })).toBe(
      ['{"code":null,"count":1}', '{"code":401,"count":1}'].join('\n')
    );
  });

  it('writes JSON lines with no # lines', () => {
    expect(query({ json: true, fields: 'id,code', limit: 2 })).toBe(
      ['{"id":"r6","code":500}', '{"id":"r5"}'].join('\n')
    );
  });

  it('gets one row whole, cut unless full', () => {
    expect(query({ get: 'r4' })).toBe(`# net r4\n${JSON.stringify(ROWS[2], null, 2)}`);
    expect(query({ get: 'r4', json: true })).toBe(JSON.stringify(ROWS[2]));
    expect(query({ get: 'r3', json: true })).toContain('[cut at 2048 of 5000 chars');
    expect(query({ get: 'r3', json: true, full: true })).toBe(JSON.stringify(ROWS[3]));
  });

  it('says so when the app turned the topic off', () => {
    const off = { ...NET, enabled: () => false };
    expect(runQuery([off], { topic: 'net' })).toBe(
      '# net is off: the app turned it off in its devtools config'
    );
    expect(runQuery([{ ...off, off: 'no client' }], { topic: 'net' })).toBe(
      '# net is off: no client'
    );
  });

  it('answers wait while the topic still has to read something', () => {
    const prepare = jest.fn((asked: AgentQuery) =>
      asked.get ? `reading ${asked.get}` : undefined
    );
    const reading = { ...NET, prepare };
    expect(runQuery([reading], { topic: 'net', get: 'r4' })).toBe('# wait: reading r4');
    expect(runQuery([reading], { topic: 'net', count: true })).toBe('6');
  });
});

describe('runQuery errors', () => {
  const FIELDS = 'Fields: id, t, method, code, ms, url, body';

  it.each<[string, Partial<AgentQuery>, string]>([
    [
      'unknown field in where',
      { where: ['status=1'] },
      `error: unknown field "status" in net. ${FIELDS}`,
    ],
    [
      'unknown field in fields',
      { fields: 'id,nope' },
      `error: unknown field "nope" in net. ${FIELDS}`,
    ],
    ['unknown field in sort', { sort: '-nope' }, `error: unknown field "nope" in net. ${FIELDS}`],
    [
      'unknown field in group-by',
      { groupBy: 'nope' },
      `error: unknown field "nope" in net. ${FIELDS}`,
    ],
    [
      'a prototype name is no field',
      { fields: 'toString' },
      `error: unknown field "toString" in net. ${FIELDS}`,
    ],
    [
      'where with no op',
      { where: ['code'] },
      'error: bad --where "code": use <field><op><value> with = != > >= < <= ~ !~, or <field>?',
    ],
    [
      'where with a bad op',
      { where: ['code==401'] },
      'error: bad --where "code==401": unknown op "==". Ops: = != > >= < <= ~ !~',
    ],
    [
      'a number op on text',
      { where: ['code>abc'] },
      'error: bad --where "code>abc": > needs a number',
    ],
    [
      'bad since',
      { since: 'yesterday' },
      'error: bad --since "yesterday": use 30s, 10m, 2h, 1d or an ISO time',
    ],
    ['bad limit', { limit: 0 }, 'error: bad --limit 0: use a whole number from 1'],
    [
      'unknown cursor',
      { after: 'r99' },
      'error: no net row "r99", it may have aged out of the buffer',
    ],
    ['unknown get', { get: 'r99' }, 'error: no net row "r99", it may have aged out of the buffer'],
  ])('%s', (_label, rest, expected) => {
    expect(query(rest)).toBe(expected);
  });

  it('names the topics there are', () => {
    expect(runQuery([NET], { topic: 'nope' })).toBe('error: unknown topic "nope". Topics: net');
    expect(runQuery([], { topic: 'net' })).toBe('error: unknown topic "net". Topics: none yet');
  });

  it('reports a bad regex', () => {
    expect(query({ grep: '/(/' })).toMatch(/^error: bad regex \/\(\/: [^\n]+$/);
  });

  it('turns a throwing topic into one line rather than a throw', () => {
    const broken = {
      ...NET,
      rows: () => {
        throw new Error('store gone\nat somewhere');
      },
    };
    expect(runQuery([broken], { topic: 'net' })).toBe('error: store gone');
  });
});

describe('the agent mask', () => {
  const http: NetworkLogEntry = {
    kind: 'http',
    id: 'n1',
    method: 'GET',
    url: 'https://api.test/me',
    status: 'success',
    statusCode: 200,
    startedAt: NOW,
    requestHeaders: { Authorization: 'Bearer SECRET-1', Cookie: 'sid=SECRET-2', Accept: 'json' },
    responseHeaders: { 'Set-Cookie': 'sid=SECRET-3', 'Content-Type': 'json' },
    pageCookies: 'sid=SECRET-4',
  };
  const socket: WebSocketLogEntry = {
    kind: 'websocket',
    id: 'w1',
    method: 'WS',
    socketId: 1,
    url: 'wss://api.test',
    status: 'open',
    startedAt: NOW,
  };
  const stored: NetworkEntry[] = [http, socket];
  const network: AgentTopic<NetworkEntry> = {
    name: 'network',
    about: 'requests',
    rows: () => stored.map(maskNetworkEntryForAgent),
    fields: {
      id: (e) => e.id,
      t: (e) => e.startedAt,
      auth: (e) => (e.kind === 'http' ? e.requestHeaders?.Authorization : undefined),
      headers: (e) => (e.kind === 'http' ? e.requestHeaders : undefined),
    },
    show: ['id', 'auth'],
  };
  const ask = (rest: Partial<AgentQuery>) => runQuery([network], { topic: 'network', ...rest });

  it('hides authorization, cookie, set-cookie and the page cookie in get, even with full', () => {
    const text = ask({ get: 'n1', full: true });
    expect(text).not.toContain('SECRET');
    expect(JSON.parse(text.split('\n').slice(1).join('\n'))).toMatchObject({
      requestHeaders: { Authorization: '[redacted]', Cookie: '[redacted]', Accept: 'json' },
      responseHeaders: { 'Set-Cookie': '[redacted]', 'Content-Type': 'json' },
      pageCookies: '[redacted]',
    });
  });

  it('hides them in lists and JSON lines', () => {
    expect(ask({})).not.toContain('SECRET');
    expect(ask({ fields: 'id,headers', json: true, full: true })).not.toContain('SECRET');
  });

  it('runs before the filters, so grep and where cannot probe a masked value', () => {
    expect(ask({ count: true, grep: 'SECRET' })).toBe('0');
    expect(ask({ count: true, where: ['auth~Bearer'] })).toBe('0');
  });

  it('leaves the stored entry alone and passes a socket through', () => {
    ask({ get: 'n1' });
    expect(http.requestHeaders?.Authorization).toBe('Bearer SECRET-1');
    expect(maskNetworkEntryForAgent(socket)).toBe(socket);
  });
});
