import { main, nodeVersionError } from '../cli.client';
import { HELP } from '../constants/help.const';
import { pickApp, type App } from '../services/find-apps.service';

type Page = ReturnType<typeof page>;

const SILENT = Symbol('silent');
const sockets: FakeSocket[] = [];
/** `windows`: the pages a DevTools window is open on, or undefined for a Metro with no route. */
let metro: Record<number, { pages: Page[]; slug?: string; windows?: string[] }> = {};
/** What the DevTools window was asked to call, through Metro's route. */
let relayed: { page: string; call: 'hello' | 'run' | 'act'; arg?: unknown }[] = [];
/** What the app answers an evaluate with. Runs the real expression against a fake agent. */
let answer: (expression: string, socket: FakeSocket) => unknown;
let stdout = '';
let stderr = '';

const agent = {
  hello: jest.fn(),
  run: jest.fn(),
  act: jest.fn(),
};

class FakeSocket {
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onerror?: () => void;
  onclose?: (event: { code: number; reason: string }) => void;
  expressions: string[] = [];
  closed = false;

  constructor(
    readonly url: string,
    readonly init: { headers: Record<string, string> }
  ) {
    sockets.push(this);
    Promise.resolve().then(() => this.onopen?.());
  }

  send(data: string) {
    const { id, params } = JSON.parse(data);
    this.expressions.push(params.expression);
    const value = answer(params.expression, this);
    if (value === SILENT) return;
    Promise.resolve().then(() =>
      this.onmessage?.({ data: JSON.stringify({ id, result: { result: { value } } }) })
    );
  }

  close() {
    this.closed = true;
  }
}

function page(device: string, port: number, options: { multi?: boolean; title?: string } = {}) {
  return {
    title: options.title ?? 'React Native Bridgeless',
    appId: 'com.example.app',
    deviceName: device,
    webSocketDebuggerUrl: `ws://127.0.0.1:${port}/inspector/debug?device=${device}&page=1`,
    reactNative: {
      logicalDeviceId: device,
      capabilities: {
        nativePageReloads: options.title === undefined,
        supportsMultipleDebuggers: options.multi ?? true,
      },
    },
  };
}

// The real expression the CLI sends, run against the fake agent on this global.
// eslint-disable-next-line no-new-func
const evalExpression = (expression: string) => new Function(`return ${expression}`)();

beforeEach(() => {
  sockets.length = 0;
  relayed = [];
  stdout = '';
  stderr = '';
  metro = { 8081: { pages: [page('iPhone 16', 8081)], slug: 'my-app' } };
  answer = evalExpression;
  agent.hello.mockReset().mockReturnValue({
    version: '3.8.0',
    platform: 'ios',
    topics: [
      { name: 'network', about: 'HTTP since launch', rows: 214, actions: ['block', 'send'] },
      { name: 'query', about: 'TanStack Query cache', rows: null, actions: [] },
    ],
  });
  agent.act.mockReset().mockReturnValue('# network · blocking https://x');
  agent.run.mockReset().mockReturnValue('# network · 1 of 214 match\nid\turl\nn1\thttps://x');
  (globalThis as any).__AXONPACK_AGENT__ = agent;
  (globalThis as any).WebSocket = FakeSocket;
  (globalThis as any).fetch = jest.fn(async (url: string, init: { headers?: any; body?: any }) => {
    const { port, pathname } = new URL(url);
    const server = metro[Number(port)];
    if (!server) throw new TypeError('fetch failed');
    const reply = (body: unknown) => ({
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
      json: async () => body,
    });
    if (pathname === '/status') return reply('packager-status:running');
    if (pathname === '/json/list') return reply(server.pages);
    if (pathname === '/axonpack-rn-devtools-tab/agent' && server.windows) {
      if (!init?.body) return reply(server.windows);
      // The window makes the call on its own connection: the same agent, reached another way.
      const call = JSON.parse(init.body);
      relayed.push(call);
      const app = (globalThis as any).__AXONPACK_AGENT__;
      try {
        return reply({ value: app ? app[call.call](call.arg) : null });
      } catch (error) {
        return reply({ error: `the app threw: ${error}\n    at run (app.js:1:1)` });
      }
    }
    if (init.headers?.['expo-platform'] && server.slug) {
      return reply({ extra: { expoClient: { slug: server.slug, name: 'My App' } } });
    }
    throw new Error('404');
  });
  jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdout += chunk;
    return true;
  });
  jest.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderr += chunk;
    return true;
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete (globalThis as any).__AXONPACK_AGENT__;
});

describe('Node version gate', () => {
  it.each(['22.0.0', '24.11.0'])('runs on Node %s', (version) => {
    expect(nodeVersionError(version)).toBeUndefined();
  });

  it('names the version it needs on older Node, before touching the network', async () => {
    expect(await main(['apps'], '20.11.1')).toBe(1);
    expect(stderr).toBe('error: devtools needs Node 22 or newer, and this is Node 20.11.1.\n');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('a query', () => {
  it('passes the flags to run and prints the reply with the app and device', async () => {
    expect(await main(['network', '--where', 'code>=400', '--since', '10m', '--limit', '5'])).toBe(
      0
    );

    expect(agent.run).toHaveBeenCalledWith({
      topic: 'network',
      where: ['code>=400'],
      since: '10m',
      limit: 5,
    });
    expect(stdout).toBe(
      '# network · my-app · iPhone 16 · 1 of 214 match\nid\turl\nn1\thttps://x\n'
    );
    expect(sockets).toHaveLength(1);
    expect(sockets[0].init.headers.Origin).toBe('http://127.0.0.1:8081');
    expect(sockets[0].closed).toBe(true);
  });

  it('sends non-ASCII text as escapes that reach the app unchanged', async () => {
    await main(['console', '--grep', 'café 😀']);

    expect(sockets[0].expressions[0]).toMatch(/^[ -~]*$/);
    expect(agent.run).toHaveBeenCalledWith({ topic: 'console', grep: 'café 😀' });
  });

  it('asks get for one row', async () => {
    agent.run.mockReturnValue('# network n1\n{}');
    expect(await main(['get', 'network', 'n1', '--full'])).toBe(0);
    expect(agent.run).toHaveBeenCalledWith({ topic: 'network', get: 'n1', full: true });
    expect(stdout).toBe('# network n1\n{}\n');
  });

  it('exits 1 on an error reply, printing it', async () => {
    agent.run.mockReturnValue('error: no network row "n9", it may have aged out of the buffer');
    expect(await main(['get', 'network', 'n9'])).toBe(1);
    expect(stdout).toBe('error: no network row "n9", it may have aged out of the buffer\n');
  });

  it('exits 1 on a bad flag or a missing id without looking for apps', async () => {
    expect(await main(['network', '--limit', 'x'])).toBe(1);
    expect(await main(['get', 'network'])).toBe(1);
    expect(stderr).toContain('usage: devtools get <topic> <id>');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('exits 2 when the app has no agent', async () => {
    delete (globalThis as any).__AXONPACK_AGENT__;
    expect(await main(['network'])).toBe(2);
    expect(stderr).toContain('my-app on iPhone 16 has no devtools agent');
  });

  it('exits 2 when no Metro is running', async () => {
    metro = {};
    expect(await main(['network'])).toBe(2);
    expect(stderr).toContain('no app found on Metro ports 8081 to 8090');
  });

  it('writes the entry alone to --out, so the file is JSON, and its # line to stdout', async () => {
    const fs = require('node:fs');
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    agent.run.mockReturnValue('# network n1\n{\n  "id": "n1"\n}');
    expect(await main(['get', 'network', 'n1', '--out', 'row.json'])).toBe(0);
    expect(agent.run).toHaveBeenCalledWith({ topic: 'network', get: 'n1', full: true });
    expect(write).toHaveBeenCalledWith('row.json', '{\n  "id": "n1"\n}\n');
    expect(JSON.parse(write.mock.calls[0][1] as string)).toEqual({ id: 'n1' });
    expect(stdout).toBe('# network n1: wrote 16 chars to row.json\n');
  });

  it('prints nothing for --json with no rows', async () => {
    agent.run.mockReturnValue('');
    expect(await main(['network', '--json'])).toBe(0);
    expect(stdout).toBe('');
  });
});

describe('the way in', () => {
  const PAGE = 'device=iPhone 16&page=1';

  it('attaches its own debugger where the app shares it, window or not', async () => {
    metro[8081].windows = [PAGE];
    expect(await main(['network'])).toBe(0);
    expect(sockets).toHaveLength(1);
    expect(relayed).toHaveLength(0);
  });

  it('asks the open DevTools window where the app allows one debugger', async () => {
    metro[8081] = {
      ...metro[8081],
      pages: [page('iPhone 16', 8081, { multi: false })],
      windows: [PAGE],
    };

    expect(await main(['network', '--limit', '5'])).toBe(0);
    expect(relayed).toEqual([{ page: PAGE, call: 'run', arg: { topic: 'network', limit: 5 } }]);
    expect(sockets).toHaveLength(0);
    expect(stdout).toBe(
      '# network · my-app · iPhone 16 · 1 of 214 match\nid\turl\nn1\thttps://x\n'
    );
  });

  it('prints what the window answered when the call failed', async () => {
    metro[8081] = {
      ...metro[8081],
      pages: [page('iPhone 16', 8081, { multi: false })],
      windows: [PAGE],
    };
    agent.run.mockImplementation(() => {
      throw new TypeError('x');
    });

    expect(await main(['network'])).toBe(1);
    expect(stderr).toBe('error: the app threw: TypeError: x\n');
  });

  it('attaches directly where no window is open, since there is none to close', async () => {
    metro[8081] = {
      ...metro[8081],
      pages: [page('iPhone 16', 8081, { multi: false })],
      windows: [],
    };
    expect(await main(['network'])).toBe(0);
    expect(sockets).toHaveLength(1);
    expect(relayed).toHaveLength(0);
  });

  it('needs --force where Metro has no route to tell whether a window is open', async () => {
    metro[8081].pages = [page('iPhone 16', 8081, { multi: false })];

    expect(await main(['network'])).toBe(2);
    expect(stderr).toContain('metro.config.js has no withDevtools');
    expect(stderr).toContain('Pass --force');
    expect(sockets).toHaveLength(0);

    expect(await main(['network', '--force'])).toBe(0);
    expect(sockets).toHaveLength(1);
  });
});

describe('# wait:', () => {
  it('asks again until the reply is not a wait', async () => {
    agent.run
      .mockReturnValueOnce('# wait: listing the keys of AsyncStorage')
      .mockReturnValueOnce('# wait: reading 3 values')
      .mockReturnValue('# storage · 3 of 3 match');

    expect(await main(['storage'])).toBe(0);
    expect(agent.run).toHaveBeenCalledTimes(3);
    expect(stdout).toBe('# storage · my-app · iPhone 16 · 3 of 3 match\n');
  });

  it('says to run it again when the time runs out while the app is still reading', async () => {
    jest.useFakeTimers();
    agent.run.mockReturnValue('# wait: listing the keys of AsyncStorage');

    const code = main(['storage', '--grep', 'token']);
    for (let i = 0; i < 60; i++) await jest.advanceTimersByTimeAsync(100);

    expect(await code).toBe(1);
    expect(stderr).toBe(
      'error: still listing the keys of AsyncStorage after 5 s. The app keeps going, so run the same command again to pick up where it stopped.\n'
    );
  });

  it('gives the breakpoint hint only when the app never answered', async () => {
    jest.useFakeTimers();
    answer = () => SILENT;

    const code = main(['network']);
    for (let i = 0; i < 60; i++) await jest.advanceTimersByTimeAsync(100);

    expect(await code).toBe(1);
    expect(stderr).toBe(
      'error: no reply from my-app on iPhone 16 in 5 s. Its JS may be paused at a breakpoint: resume it, then run the command again.\n'
    );
    expect(sockets[0].closed).toBe(true);
  });
});

describe('an action', () => {
  const PAGE = 'device=iPhone 16&page=1';

  it('passes the action, its words and options to act, and prints the reply with the app', async () => {
    expect(
      await main([
        'network',
        'send',
        'POST',
        'https://x',
        '--header',
        'Accept: */*',
        '--body',
        '{}',
        '--yes',
      ])
    ).toBe(0);

    expect(agent.act).toHaveBeenCalledWith({
      topic: 'network',
      action: 'send',
      args: ['POST', 'https://x'],
      options: { header: ['Accept: */*'], body: '{}', yes: true },
      ref: expect.any(String),
    });
    expect(agent.run).not.toHaveBeenCalled();
    expect(stdout).toBe('# network · my-app · iPhone 16 · blocking https://x\n');
  });

  it('reads --body-file here and sends its text as the body', async () => {
    const fs = require('node:fs');
    jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      if (path === 'feed.json') return '[{"id":1}]';
      throw new Error(`ENOENT: no such file, open '${path}'`);
    });

    expect(await main(['network', 'override', 'https://x', '--body-file', 'feed.json'])).toBe(0);
    expect(agent.act.mock.calls[0][0].options).toEqual({ body: '[{"id":1}]' });

    expect(await main(['network', 'override', 'https://x', '--body-file', 'nope.json'])).toBe(1);
    expect(stderr).toBe(
      "error: can't read --body-file nope.json: ENOENT: no such file, open 'nope.json'\n"
    );
    expect(agent.act).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      ['network', 'send', 'GET', 'https://x', '--json'],
      "query flags such as --where, --json and --out don't go with an action, and network send is one",
    ],
    [['network', 'block', 'https://x', '--out', 'x.txt'], "don't go with an action"],
    [
      ['network', '--status', '404'],
      '--status, --body, --body-file, --content-type, --header, --yes and --all go with an action',
    ],
    [['get', 'network', 'n1', '--yes'], 'go with an action'],
    [
      ['network', 'override', 'https://x', '--body', 'a', '--body-file', 'b'],
      'pass --body or --body-file, not both',
    ],
  ])('refuses %j before looking for apps', async (argv, message) => {
    expect(await main(argv)).toBe(1);
    expect(stderr).toContain(message);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('exits 1 on an error reply, such as a POST without --yes', async () => {
    agent.act.mockReturnValue(
      'error: POST can change data on the server, so it needs --yes. GET, HEAD and OPTIONS go without'
    );
    expect(await main(['network', 'send', 'POST', 'https://x'])).toBe(1);
    expect(stdout).toBe(
      'error: POST can change data on the server, so it needs --yes. GET, HEAD and OPTIONS go without\n'
    );
  });

  it('asks again with the same call while the app waits on the request', async () => {
    agent.act
      .mockReturnValueOnce('# wait: sending GET https://x as n7')
      .mockReturnValue('# network · sent GET https://x as n7\nid\tcode\nn7\t200');

    expect(await main(['network', 'send', 'GET', 'https://x'])).toBe(0);
    expect(agent.act).toHaveBeenCalledTimes(2);
    expect(agent.act.mock.calls[1][0]).toEqual(agent.act.mock.calls[0][0]);
    expect(stdout).toBe(
      '# network · my-app · iPhone 16 · sent GET https://x as n7\nid\tcode\nn7\t200\n'
    );
  });

  it('says where the outcome lands, not to run it again, when the time runs out', async () => {
    jest.useFakeTimers();
    agent.act.mockReturnValue('# wait: sending GET https://x as n7');

    const code = main(['network', 'send', 'GET', 'https://x']);
    for (let i = 0; i < 60; i++) await jest.advanceTimersByTimeAsync(100);

    expect(await code).toBe(1);
    expect(stderr).toBe(
      "error: still sending GET https://x as n7 after 5 s. It carries on in the app, and devtools ai-usage --where 'action?' shows how it ended.\n"
    );
  });

  it('goes through the open DevTools window like a query', async () => {
    metro[8081] = {
      ...metro[8081],
      pages: [page('iPhone 16', 8081, { multi: false })],
      windows: [PAGE],
    };

    expect(await main(['network', 'unoverride', '--all'])).toBe(0);
    expect(relayed).toEqual([
      {
        page: PAGE,
        call: 'act',
        arg: {
          topic: 'network',
          action: 'unoverride',
          args: [],
          options: { all: true },
          ref: expect.any(String),
        },
      },
    ]);
    expect(sockets).toHaveLength(0);
  });
});

describe('apps', () => {
  it('lists one row per app and device across Metro ports', async () => {
    metro = {
      8081: {
        slug: 'my-app',
        pages: [
          // Noise /json/list carries: an older page of the same device, and a non-reloadable one.
          { ...page('iPhone 16', 8081), webSocketDebuggerUrl: 'ws://old' },
          page('iPhone 16', 8081),
          { ...page('iPhone 16', 8081), title: 'Hermes', reactNative: { logicalDeviceId: 'x' } },
          page('Pixel 8', 8081, { multi: false }),
        ],
      },
      // No Expo manifest: the slug falls back to the page's app id.
      8083: { pages: [page('iPad', 8083)] },
    };
    answer = (expression, socket) =>
      socket.url.includes('iPad') ? null : evalExpression(expression);

    expect(await main(['apps'])).toBe(0);
    expect(stdout).toBe(
      [
        'app\tname\tdevice\tdevtools\tmetro\tnote',
        'my-app\tMy App\tiPhone 16\t3.8.0\t8081\t-',
        "my-app\tMy App\tPixel 8\t?\t8081\tcan't share its debugger, and metro.config.js has no withDevtools",
        'com.example.app\t-\tiPad\t-\t8083\t-',
        '# ?: checking would close a DevTools window open on the app. --force checks anyway.',
        '',
      ].join('\n')
    );
    expect(sockets.map((socket) => socket.url)).not.toContain('ws://old');
  });

  it('asks through the open window, with no footnote when no row shows ?', async () => {
    metro[8081] = {
      ...metro[8081],
      pages: [page('Pixel 8', 8081, { multi: false })],
      windows: ['device=Pixel 8&page=1'],
    };

    expect(await main(['apps'])).toBe(0);
    expect(stdout).toBe(
      [
        'app\tname\tdevice\tdevtools\tmetro\tnote',
        'my-app\tMy App\tPixel 8\t3.8.0\t8081\t-',
        '',
      ].join('\n')
    );
    expect(relayed).toEqual([{ page: 'device=Pixel 8&page=1', call: 'hello' }]);
    expect(sockets).toHaveLength(0);
  });

  it('prints JSON lines with --json', async () => {
    expect(await main(['apps', '--json'])).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      app: 'my-app',
      name: 'My App',
      device: 'iPhone 16',
      devtools: '3.8.0',
      metro: 8081,
      note: null,
    });
  });

  it('exits 2 when no app is running', async () => {
    metro = {};
    expect(await main(['apps', '--port', '8099'])).toBe(2);
    expect(stderr).toContain('no app found on Metro port 8099');
  });
});

describe('topics', () => {
  it('lists name, row count and description, and says when a topic is off', async () => {
    expect(await main(['topics'])).toBe(0);
    expect(stdout).toBe(
      [
        '# topics · my-app · iPhone 16',
        'topic\trows\tactions\tabout',
        'network\t214\tblock,send\tHTTP since launch',
        'query\toff\t-\tTanStack Query cache',
        '',
      ].join('\n')
    );
    expect(agent.run).not.toHaveBeenCalled();
  });
});

describe('choosing the app', () => {
  const app = (slug: string, device: string): App => ({
    slug,
    device,
    port: 8081,
    url: `ws://${slug}/${device}`,
    multipleDebuggers: true,
  });
  const apps = [app('my-app', 'iPhone 16'), app('my-app', 'Pixel 8'), app('admin', 'iPhone 16')];

  it('needs no flags when one app is running', () => {
    expect(pickApp([apps[0]], {})).toBe(apps[0]);
  });

  it('matches the slug whole and the device by part, in any case', () => {
    expect(pickApp(apps, { app: 'ADMIN' })).toBe(apps[2]);
    expect(pickApp(apps, { app: 'my-app', device: 'pixel' })).toBe(apps[1]);
    expect(pickApp(apps, { app: 'my' })).toEqual(
      expect.stringContaining('no app matches --app my')
    );
  });

  it('lists the candidates when several match', () => {
    expect(pickApp(apps, { device: 'iphone' })).toBe(
      [
        '2 apps match --device iphone. Pick one:',
        "  --app my-app --device 'iPhone 16'  (metro 8081)",
        "  --app admin --device 'iPhone 16'  (metro 8081)",
      ].join('\n')
    );
  });

  it('exits 2 on an ambiguous match, and runs once a flag settles it', async () => {
    metro[8081].pages.push(page('Pixel 8', 8081));

    expect(await main(['network'])).toBe(2);
    expect(stderr).toContain('2 apps match. Pick one:');
    expect(sockets).toHaveLength(0);

    expect(await main(['network', '--device', 'pixel'])).toBe(0);
    expect(stdout).toContain('# network · my-app · Pixel 8 ·');
  });
});

describe('--help', () => {
  it.each([
    [[], HELP.main],
    [['--help'], HELP.main],
    [['apps', '--help'], HELP.apps],
    [['topics', '-h'], HELP.topics],
    [['get', '--help'], HELP.get],
    [['network', '--help'], `${HELP.query}\n\n${HELP.network}`],
    [['network', 'send', '--help'], HELP.network],
    [['console', '--help'], HELP.query],
  ])('%j prints its help without looking for apps', async (argv, help) => {
    expect(await main(argv)).toBe(0);
    expect(stdout).toBe(`${help}\n`);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('leads with npx devtools, then the long form that always runs this package', () => {
    expect(HELP.main.split('\n')[2]).toContain('npx devtools <command>');
    const long = HELP.main.indexOf('npx @axonpack/expo-devtools <command>');
    expect(long).toBeGreaterThan(HELP.main.indexOf('npx devtools <command>'));
    for (const runner of ['bunx devtools', 'yarn devtools', 'pnpm exec devtools']) {
      expect(HELP.main.indexOf(runner)).toBeGreaterThan(long);
    }
  });
});
