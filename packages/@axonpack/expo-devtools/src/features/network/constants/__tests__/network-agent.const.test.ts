import type { AgentActionOptions } from '../../../../agent/constants/agent-topics.const';
import { runAction } from '../../../../agent/utils/run-action.util';
import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import { patchFetch } from '../../services/patch-fetch.service';
import { networkLogStore } from '../../stores/network-log.store';
import { networkOverridesStore } from '../../stores/network-overrides.store';
import { NETWORK_AGENT } from '../network-agent.const';

const NOW = Date.now();
const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([NETWORK_AGENT], { topic: 'network', ...rest }).text;
const ids = (text: string) =>
  text
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .slice(1)
    .map((line) => line.split('\t')[0]);
const nextCursor = () => ask().split('\n').pop();

beforeEach(() => {
  networkLogStore.clear();
  networkLogStore.setEnabled(true);
  networkLogStore.add({
    id: 'h1',
    method: 'GET',
    url: 'https://api.test/me',
    status: 'error',
    statusCode: 401,
    startedAt: NOW - 4000,
    duration: 120,
    requestHeaders: { authorization: 'Bearer SECRET-1', accept: 'json' },
    responseHeaders: { 'set-cookie': 'sid=SECRET-2' },
    responseBody: '{"error":"expired"}',
  });
  networkLogStore.addWebSocket({
    id: 'w1',
    method: 'WS',
    socketId: 1,
    url: 'wss://api.test/live',
    status: 'open',
    startedAt: NOW - 3000,
  });
  networkLogStore.addWebSocketMessage('w1', {
    id: 'm1',
    direction: 'received',
    data: 'hello frame',
    messageType: 'text',
    timestamp: NOW,
  });
  networkLogStore.add({
    id: 's1',
    method: 'GET',
    url: 'https://api.test/events',
    status: 'success',
    statusCode: 200,
    eventStream: true,
    startedAt: NOW - 2000,
  });
  networkLogStore.addStreamEvent('s1', { id: 'e1', type: 'message', data: 'tick', timestamp: NOW });
  networkLogStore.add({
    id: 'h2',
    method: 'POST',
    url: 'https://api.test/upload',
    status: 'pending',
    startedAt: NOW - 1000,
  });
});

describe('the network topic', () => {
  it('lists HTTP, sockets and streams newest first, in the default columns', () => {
    expect(ask()).toBe(
      [
        '# network · 4 of 4 match',
        'id\tmethod\tcode\tstate\tms\turl',
        'h2\tPOST\t-\tpending\t-\thttps://api.test/upload',
        's1\tGET\t200\tsuccess\t-\thttps://api.test/events',
        'w1\tWS\t-\topen\t-\twss://api.test/live',
        'h1\tGET\t401\terror\t120\thttps://api.test/me',
        '# next: --after s1',
      ].join('\n')
    );
  });

  it('filters on kind and code, and counts frames and events', () => {
    expect(ids(ask({ where: ['kind=ws,sse'], fields: 'id,kind,msgs' }))).toEqual(['s1', 'w1']);
    expect(ask({ where: ['kind=ws,sse'], fields: 'id,msgs', json: true })).toBe(
      ['{"id":"s1","msgs":1}', '{"id":"w1","msgs":1}'].join('\n')
    );
    expect(ids(ask({ where: ['code>=400'] }))).toEqual(['h1']);
  });

  it('keeps code to HTTP, and failed requests to 4xx/5xx and requests that never came back', () => {
    networkLogStore.updateWebSocket('w1', { status: 'closed', closeCode: 1000, duration: 900 });
    networkLogStore.add({
      id: 'h3',
      method: 'GET',
      url: 'https://api.test/down',
      status: 'error',
      error: 'Network request failed',
      startedAt: NOW - 500,
      duration: 30,
    });
    // As the store keeps it: a 5xx that came back is a `success`.
    networkLogStore.add({
      id: 'h4',
      method: 'GET',
      url: 'https://api.test/flaky',
      status: 'success',
      statusCode: 503,
      startedAt: NOW - 400,
      duration: 40,
    });

    expect(ids(ask({ where: ['code>=400'] }))).toEqual(['h4', 'h1']);
    expect(ids(ask({ where: ['state=error'] }))).toEqual(['h4', 'h3', 'h1']);
    expect(ask({ where: ['id=h4,w1'], fields: 'id,code,close,state' })).toBe(
      [
        '# network · 2 of 6 match',
        'id\tcode\tclose\tstate',
        'h4\t503\t-\terror',
        'w1\t-\t1000\tclosed',
        // h2 is still in flight.
        '# next: --after s1',
      ].join('\n')
    );
  });

  it('gets a socket with its frames and a stream with its events', () => {
    expect(JSON.parse(ask({ get: 'w1', json: true })).messages[0].data).toBe('hello frame');
    expect(JSON.parse(ask({ get: 's1', json: true })).events[0].data).toBe('tick');
    expect(ids(ask({ grep: 'hello frame' }))).toEqual(['w1']);
  });

  it('gets the initiator as short locations, with vendor frames only when full', () => {
    const bundle = 'http://localhost:8081/example/index.bundle//&platform=ios&dev=true';
    networkLogStore.add({
      id: 'h3',
      method: 'POST',
      url: 'https://api.test/login',
      status: 'error',
      startedAt: NOW,
      initiator: [
        { fn: 'fetchJson', location: `${bundle}:120:8`, vendor: true },
        { fn: 'login', location: `${bundle}:4410:12`, vendor: false },
      ],
    });
    const login = { fn: 'login', location: 'index.bundle:4410:12', vendor: false };
    expect(JSON.parse(ask({ get: 'h3', json: true })).initiator).toEqual([login]);
    expect(JSON.parse(ask({ get: 'h3', json: true, full: true })).initiator).toEqual([
      { fn: 'fetchJson', location: 'index.bundle:120:8', vendor: true },
      login,
    ]);
  });

  it('masks authorization and cookies in get, lists and filters', () => {
    const row = JSON.parse(ask({ get: 'h1', json: true, full: true }));
    expect(row.requestHeaders).toEqual({ authorization: '[redacted]', accept: 'json' });
    expect(row.responseHeaders).toEqual({ 'set-cookie': '[redacted]' });
    expect(ask({ grep: 'SECRET', count: true })).toBe('0');
    expect(ask({ fields: 'id,response', full: true })).not.toContain('SECRET');
  });

  describe('pending', () => {
    it('holds next before an HTTP request in flight', () => {
      expect(nextCursor()).toBe('# next: --after s1');
    });

    it('lets it pass an open socket and a live stream once the request ends', () => {
      networkLogStore.update('h2', { status: 'success', statusCode: 201, duration: 30 });
      expect(nextCursor()).toBe('# next: --after h2');
    });

    it('holds it before a socket that is still connecting', () => {
      networkLogStore.update('h2', { status: 'success', statusCode: 201, duration: 30 });
      networkLogStore.updateWebSocket('w1', { status: 'connecting' });
      expect(nextCursor()).toBe('# next: --after h1');
    });
  });

  it('says so when the store is off', () => {
    networkLogStore.setEnabled(false);
    expect(ask()).toBe('# network is off: the app turned it off in its devtools config');
  });
});

describe('network actions', () => {
  /** The network behind the patched fetch: what it was asked, and a 201 back. */
  const server = jest.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response('{"saved":true}', {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
  );
  const start = (action: string, args: string[] = [], options: AgentActionOptions = {}) =>
    runAction([NETWORK_AGENT], { topic: 'network', action, args, options });
  const act = async (...call: Parameters<typeof start>) => {
    const answer = start(...call);
    return typeof answer === 'string' ? answer : answer.answer;
  };
  const sentHeaders = () => server.mock.calls[0][1]?.headers as Record<string, string>;

  beforeAll(() => {
    // Stubbed before patching, so the app's own patched fetch stands in front of it.
    globalThis.fetch = ((url: string, init?: RequestInit) =>
      server(url, init)) as typeof globalThis.fetch;
    patchFetch();
  });

  beforeEach(() => {
    server.mockClear();
    networkOverridesStore.clear();
  });

  describe('overrides', () => {
    it('sets a mock response in the overrides store, with the defaults the editor uses', async () => {
      expect(await act('override', ['https://api.test/me'])).toBe(
        "# network · override on https://api.test/me: 200, application/json, 0 chars. The app's requests to that exact URL get it, without reaching the network"
      );
      await act('override', ['https://api.test/feed'], {
        status: '503',
        body: 'down',
        contentType: 'text/plain',
      });
      expect(networkOverridesStore.getSnapshot()).toEqual([
        {
          url: 'https://api.test/feed',
          action: 'respond',
          status: 503,
          body: 'down',
          contentType: 'text/plain',
        },
        {
          url: 'https://api.test/me',
          action: 'respond',
          status: 200,
          body: '',
          contentType: 'application/json',
        },
      ]);
    });

    it("answers the app's own request with the mock, and the row shows it", async () => {
      await act('override', ['https://api.test/me'], { status: '404', body: '{"error":"gone"}' });
      const response = await fetch('https://api.test/me');

      expect(response.status).toBe(404);
      expect(server).not.toHaveBeenCalled();
      expect(
        ask({ where: ['url=https://api.test/me', 'code=404'], fields: 'code,response' })
      ).toContain('404\t{"error":"gone"}');
    });

    it('blocks, lists and removes', async () => {
      await act('override', ['https://api.test/me'], { status: '500', body: 'x' });
      expect(await act('block', ['https://cdn.test/a.png'])).toBe(
        "# network · blocking https://cdn.test/a.png: the app's requests to that exact URL fail as if offline"
      );
      expect(await act('overrides')).toBe(
        [
          '# network · 2 overrides',
          'url\taction\tstatus\ttype\tsize',
          'https://cdn.test/a.png\tblock\t-\t-\t-',
          'https://api.test/me\trespond\t500\tapplication/json\t1',
        ].join('\n')
      );
      await expect(fetch('https://cdn.test/a.png')).rejects.toThrow('Network request failed');

      expect(await act('unoverride', ['https://cdn.test/a.png'])).toBe(
        '# network · removed the override on https://cdn.test/a.png'
      );
      expect(await act('unoverride', ['https://cdn.test/a.png'])).toBe(
        'error: no override on https://cdn.test/a.png. devtools network overrides lists them'
      );
      expect(await act('unoverride', [], { all: true })).toBe('# network · removed 1 override');
      expect(await act('overrides')).toBe(
        '# network · 0 overrides\nurl\taction\tstatus\ttype\tsize'
      );
    });

    it.each([
      [['override', ['/v1/me']], 'error: "/v1/me" is not a whole URL'],
      [
        ['override', ['https://api.test/me'], { status: '99' }],
        'error: bad --status 99: use 200 to 599',
      ],
      [['override', ['https://api.test/me'], { status: 'ok' }], 'error: bad --status ok'],
      [['block', ['api.test/me']], 'error: "api.test/me" is not a whole URL'],
      [['unoverride', []], 'error: usage: devtools network unoverride <url> | --all'],
      [
        ['unoverride', ['https://api.test/me'], { all: true }],
        'error: usage: devtools network unoverride <url> | --all',
      ],
      [
        ['override', ['https://api.test/me'], { yes: true }],
        'error: network override takes no --yes',
      ],
    ] as const)('refuses %j', async (call, error) => {
      expect(await act(...(call as unknown as Parameters<typeof start>))).toMatch(error);
      expect(networkOverridesStore.getSnapshot()).toEqual([]);
    });
  });

  describe('send', () => {
    it('sends a GET from the app, waits for it, and answers the new row', async () => {
      const answer = start('send', ['get', 'https://api.test/notes'], {
        header: ['Accept: application/json'],
      });
      if (typeof answer === 'string') throw new Error(answer);
      const [row] = networkLogStore.getSnapshot();

      expect(answer.waitingFor).toBe(`sending GET https://api.test/notes as ${row.id}`);
      expect(await answer.answer).toBe(
        [
          `# network · sent GET https://api.test/notes as ${row.id}. devtools get network ${row.id} shows it whole`,
          'id\tmethod\tcode\tstate\tms\turl\terror',
          `${row.id}\tGET\t201\tsuccess\t${networkLogStore.getSnapshot()[0].duration}\thttps://api.test/notes\t-`,
        ].join('\n')
      );
      expect(server).toHaveBeenCalledTimes(1);
      expect(server.mock.calls[0][0]).toBe('https://api.test/notes');
      expect(sentHeaders()).toEqual({ Accept: 'application/json' });
    });

    it('needs --yes for any method but GET, checked here, and sends nothing without it', async () => {
      const rows = networkLogStore.getSnapshot().length;
      expect(await act('send', ['POST', 'https://api.test/notes'], { body: '{"text":"hi"}' })).toBe(
        'error: POST can change data on the server, so it needs --yes. GET goes without'
      );
      expect(server).not.toHaveBeenCalled();
      expect(networkLogStore.getSnapshot()).toHaveLength(rows);

      expect(
        await act('send', ['POST', 'https://api.test/notes'], { body: '{"text":"hi"}', yes: true })
      ).toContain('\tPOST\t201\tsuccess\t');
      expect(server.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{"text":"hi"}' });
    });

    it('masks a secret header it sent in the row the agent reads', async () => {
      await act('send', ['GET', 'https://api.test/me'], {
        header: ['Authorization: Bearer SECRET-3'],
      });

      expect(sentHeaders()).toEqual({ Authorization: 'Bearer SECRET-3' });
      expect(ask({ grep: 'SECRET-3', count: true })).toBe('0');
      const [row] = networkLogStore.getSnapshot();
      expect(ask({ get: row.id, full: true })).toContain('"Authorization": "[redacted]"');
    });

    it("goes through the overrides, as the app's own requests do", async () => {
      await act('override', ['https://api.test/me'], { status: '418' });
      expect(await act('send', ['GET', 'https://api.test/me'])).toContain('\tGET\t418\terror\t');
      expect(server).not.toHaveBeenCalled();
    });

    it('answers status and time when recording is paused, so no row', async () => {
      networkLogStore.setPaused(true);
      try {
        expect(await act('send', ['GET', 'https://api.test/me'])).toMatch(
          /^# network · sent GET https:\/\/api.test\/me: 201 in \d+ ms. Not in the log/
        );
      } finally {
        networkLogStore.setPaused(false);
      }
    });

    it.each([
      [['send', ['GET']], 'error: usage: devtools network send <METHOD> <url>'],
      [['send', ['GET', '/me']], 'error: "/me" is not a whole URL'],
      [['send', ['GE T', 'https://api.test/me']], 'error: bad method "GE T"'],
      [['send', ['GET', 'https://api.test/me'], { body: 'x' }], 'error: a GET request has no body'],
      [
        ['send', ['GET', 'https://api.test/me'], { header: ['no colon'] }],
        "error: bad --header: use 'Name: value'",
      ],
      [
        ['send', ['GET', 'https://api.test/me'], { status: '200' }],
        'error: network send takes no --status',
      ],
    ] as const)('refuses %j', async (call, error) => {
      expect(await act(...(call as unknown as Parameters<typeof start>))).toMatch(error);
      expect(server).not.toHaveBeenCalled();
    });
  });

  describe('replay', () => {
    it('sends a logged request again, as the sandbox would, with the edits on top', async () => {
      const reply = await act('replay', ['h1'], {
        header: ['ACCEPT: text/plain', 'X-Debug: 1'],
      });
      const [row] = networkLogStore.getSnapshot();

      expect(reply.split('\n')[0]).toBe(
        `# network · replayed h1 as ${row.id}. devtools get network ${row.id} shows it whole`
      );
      expect(server.mock.calls[0][0]).toBe('https://api.test/me');
      // The app's own token goes with it, rebuilt as the Sandbox's auth does. The agent only ever
      // sees it masked.
      expect(sentHeaders()).toEqual({
        Authorization: 'Bearer SECRET-1',
        ACCEPT: 'text/plain',
        'X-Debug': '1',
      });
      expect(reply).not.toContain('SECRET');
    });

    it('needs --yes to replay a POST', async () => {
      expect(await act('replay', ['h2'])).toBe(
        'error: POST can change data on the server, so it needs --yes. GET goes without'
      );
      expect(server).not.toHaveBeenCalled();
      expect(await act('replay', ['h2'], { yes: true, body: 'edited' })).toContain('\tPOST\t201\t');
      expect(server.mock.calls[0][1]).toMatchObject({ method: 'POST', body: 'edited' });
    });

    it('says what is wrong with an id it cannot replay', async () => {
      expect(await act('replay', ['w1'])).toBe(
        'error: w1 is a WebSocket. replay sends HTTP requests only'
      );
      expect(await act('replay', ['n9'])).toBe(
        'error: no network row "n9", it may have aged out of the buffer'
      );
    });
  });
});
