import { installAgent } from '../../../../agent/services/install-agent.service';
import { runAction } from '../../../../agent/utils/run-action.util';
import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import { aiUsageStore } from '../../../ai-usage/stores/ai-usage.store';
import {
  configureRepl,
  evaluateExpression,
  getReplContext,
} from '../../services/evaluate-expression.service';
import { configureContextRedaction } from '../../services/redact-context.service';
import { CONTEXT_AGENT } from '../context-agent.const';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: null } }), {
  virtual: true,
});

let resolveSlow: (value: unknown) => void;
const store = {
  count: 0,
  // Reads `this`, so it only works called on `store`.
  bump(by = 1) {
    this.count += by;
    return { count: this.count };
  },
  slow: () =>
    new Promise((resolve) => {
      resolveSlow = resolve;
    }),
  fails: () => Promise.reject(new Error('server said no')),
};
const preview = {
  status: { title: 'Default', refresh: () => 'refreshed' },
  switch: (id: string) => `# preview · restarting the app on ${id}`,
};

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([CONTEXT_AGENT], { topic: 'context', ...rest }).text;
const call = (args: string[], yes?: true) =>
  runAction([CONTEXT_AGENT], { topic: 'context', action: 'call', args, options: { yes } });

beforeEach(() => {
  store.count = 0;
  configureContextRedaction({});
  configureRepl(true, { store, version: '1.2.0', shared: 'app' }, [
    { id: 'preview', context: { preview, shared: 'support' } },
  ]);
});

describe('the context topic', () => {
  it("lists the prompt's names, with their type and who exposed them", () => {
    expect(ask()).toBe(
      [
        '# context · 4 of 4 match',
        'name\ttype\tsource\tpreview',
        'preview\tobject\tpreview\t{"status":{"title":"Default","refresh":"ƒ refresh()"},"switch":"ƒ switch()"}',
        'shared\tvalue\tapp\tapp',
        'store\tobject\tapp\t{"count":0,"bump":"ƒ bump()","slow":"ƒ slow()","fails":"ƒ fails()"}',
        'version\tvalue\tapp\t1.2.0',
        '# next: --after preview',
      ].join('\n')
    );
  });

  it('has the same names as the prompt, without its own $m and $modules', () => {
    const names = ask({ fields: 'name', json: true }).split('\n');
    expect(names.map((line) => JSON.parse(line).name)).toEqual(
      Object.keys(getReplContext()).filter((name) => !name.startsWith('$'))
    );
  });

  it('cuts a long preview', () => {
    configureRepl(true, { long: 'x'.repeat(200) });
    expect(ask({ fields: 'preview', json: true })).toBe(`{"preview":"${'x'.repeat(80)}..."}`);
  });

  it('gets a value, a dot path into one, and a function as the prompt prints it', () => {
    expect(ask({ get: 'preview.status' })).toBe(
      [
        '# context preview.status',
        '{',
        '  "title": "Default",',
        '  "refresh": "ƒ refresh()"',
        '}',
      ].join('\n')
    );
    expect(ask({ get: 'preview.status.title', json: true })).toBe('"Default"');
    expect(ask({ get: 'store.bump', json: true })).toBe('"ƒ bump()"');
  });

  it('cuts a long value unless full', () => {
    configureRepl(true, { long: 'x'.repeat(3000) });
    expect(ask({ get: 'long', json: true })).toContain('[cut at 2048 of 3000 chars');
    expect(ask({ get: 'long', json: true, full: true })).toBe(`"${'x'.repeat(3000)}"`);
  });

  it('refuses a name or path that is not there, and never reaches past it', () => {
    expect(ask({ get: 'nope' })).toBe('error: no context name "nope". devtools context lists them');
    expect(ask({ get: 'preview.nope' })).toBe('error: no "nope" in preview');
    expect(ask({ get: 'version.nope.deeper' })).toBe('error: no "nope" in version');
    expect(ask({ get: 'store.bump.constructor' })).toBe(
      "error: store.bump.constructor: the CLI doesn't reach constructor"
    );
    // A global is not a name the app exposed.
    expect(ask({ get: 'globalThis' })).toBe(
      'error: no context name "globalThis". devtools context lists them'
    );
  });

  it('is off with the prompt, and says why it is empty', () => {
    configureRepl(false, { store });
    expect(ask()).toBe('# context is off: console.repl is off');
    expect(call(['store.bump'], true)).toBe('error: context is off: console.repl is off');
    configureRepl(true);
    expect(ask()).toContain(
      '# nothing exposed: add names to console.context in the devtools config'
    );
  });
});

describe('call', () => {
  it('runs a function with its owner as this, and prints what it returned', () => {
    expect(call(['store.bump'], true)).toBe(
      ['# context · store.bump returned', '{', '  "count": 1', '}'].join('\n')
    );
    expect(call(['store.bump', '[5]'], true)).toContain('"count": 6');
    expect(call(['preview.status.refresh'], true)).toBe(
      '# context · preview.status.refresh returned\n"refreshed"'
    );
  });

  it('takes a JSON array as the arguments, and any other JSON value as the one argument', () => {
    expect(call(['preview.switch', '"pr-7"'], true)).toBe(
      '# context · preview.switch returned\n"# preview · restarting the app on pr-7"'
    );
    expect(call(['preview.switch', '["pr-8"]'], true)).toContain('on pr-8');
    expect(call(['store.bump', '2'], true)).toContain('"count": 2');
  });

  it('waits for a promise, then answers what it resolved to', async () => {
    const answer = call(['store.slow'], true);
    expect(answer).toMatchObject({ waitingFor: 'running store.slow' });
    resolveSlow(undefined);
    expect(await (answer as { answer: Promise<string> }).answer).toBe(
      '# context · store.slow returned\nundefined'
    );
  });

  it('answers a rejected promise or a throw as one error line', async () => {
    const answer = call(['store.fails'], true) as { answer: Promise<string> };
    expect(await answer.answer).toBe('error: server said no');
    configureRepl(true, {
      boom: () => {
        throw new Error('boom');
      },
    });
    expect(call(['boom'], true)).toBe('error: boom');
  });

  it('refuses without --yes, and runs nothing', () => {
    expect(call(['store.bump'])).toBe('error: call runs a function in the app, so it needs --yes');
    expect(store.count).toBe(0);
  });

  it.each([
    [['nope'], 'error: no context name "nope". devtools context lists them'],
    [['store'], 'error: store is an object, not a function. devtools get context store reads it'],
    [
      ['version'],
      'error: version is a value, not a function. devtools get context version reads it',
    ],
    [
      ['store.bump', 'pr-7'],
      `error: the args must be JSON, such as '["a", 1]' for two or '"a"' for one, and pr-7 isn't`,
    ],
    [
      ['store.bump.constructor', '"return 1"'],
      "error: store.bump.constructor: the CLI doesn't reach constructor",
    ],
    [['store.bump', '1', '2'], 'error: usage: devtools context call <name> [args as JSON] --yes'],
  ])('refuses %j', (args, error) => {
    expect(call(args, true)).toBe(error);
    expect(store.count).toBe(0);
  });

  it('is logged in the CLI tab like every action', () => {
    aiUsageStore.clear();
    installAgent();
    const reply = (globalThis as any).__AXONPACK_AGENT__.act({
      topic: 'context',
      action: 'call',
      args: ['store.bump'],
      options: { yes: true },
    });
    expect(reply).toContain('"count": 1');
    expect(aiUsageStore.getSnapshot()[0]).toMatchObject({
      command: 'context call store.bump --yes',
      action: 'call',
      reply,
    });
    delete (globalThis as any).__AXONPACK_AGENT__;
  });
});

describe('redaction', () => {
  const session = {
    token: 'abc',
    user: { name: 'Ada', apiSecret: 's3' },
    list: [{ token: 'in-array' }],
    byKey: new Map<string, unknown>([
      ['token', 'in-map'],
      ['name', 'Ada'],
    ]),
    login: () => ({ token: 'fresh', ok: true }),
    loginLater: async () => ({ token: 'later' }),
  };
  const redacting = (
    keys: (string | RegExp)[],
    redact?: (name: string, value: unknown) => unknown
  ) => {
    configureRepl(true, { session, version: '1.2.0' });
    configureContextRedaction({ keys, redact });
  };

  it('hides a whole value whose exposed name matches, in the list and in get', () => {
    redacting(['SESSION']);
    expect(ask({ fields: 'name,type,preview', json: true }).split('\n')).toEqual([
      '{"name":"session","type":"object","preview":"[redacted]"}',
      '{"name":"version","type":"value","preview":"1.2.0"}',
    ]);
    expect(ask({ get: 'session' })).toBe('# context session\n"[redacted]"');
    expect(ask({ grep: 'abc' })).toContain('0 of 2 match');
  });

  it('hides a matching key at any depth, in objects, arrays and Maps', () => {
    redacting(['token']);
    expect(JSON.parse(ask({ get: 'session', json: true }))).toEqual({
      token: '[redacted]',
      user: { name: 'Ada', apiSecret: 's3' },
      list: [{ token: '[redacted]' }],
      byKey: { token: '[redacted]', name: 'Ada' },
      login: 'ƒ login()',
      loginLater: 'ƒ loginLater()',
    });
    expect(ask()).not.toContain('abc');
  });

  it('hides a dot path through a redacted segment', () => {
    redacting(['session']);
    expect(ask({ get: 'session.token', json: true })).toBe('"[redacted]"');
    expect(ask({ get: 'session.user.name', json: true })).toBe('"[redacted]"');
    redacting(['token']);
    expect(ask({ get: 'session.token', json: true })).toBe('"[redacted]"');
    expect(ask({ get: 'session.user.name', json: true })).toBe('"Ada"');
  });

  it('tests a RegExp as written', () => {
    redacting([/secret$/i]);
    expect(ask({ get: 'session.user', json: true })).toBe(
      '{"name":"Ada","apiSecret":"[redacted]"}'
    );
    expect(ask({ get: 'session.user.apiSecret', json: true })).toBe('"[redacted]"');
  });

  it('runs redact after redactKeys, with the name or path, and shows what it returns', () => {
    const redact = jest.fn((name: string, value: unknown) =>
      name === 'session.user' ? { ...(value as object), name: 'A.' } : value
    );
    redacting([/secret/i], redact);
    expect(ask({ get: 'session.user', json: true })).toBe('{"name":"A.","apiSecret":"[redacted]"}');
    expect(redact).toHaveBeenLastCalledWith('session.user', {
      name: 'Ada',
      apiSecret: '[redacted]',
    });
    // Returned as it came, the value is shown as redactKeys left it.
    expect(ask({ get: 'version', json: true })).toBe('"1.2.0"');
    redacting([], () => {
      throw new Error('bug in the hook');
    });
    expect(ask({ get: 'version', json: true })).toBe('"[redacted]"');
  });

  it('redacts what call returns, and a promise once it resolves', async () => {
    redacting(['token']);
    expect(call(['session.login'], true)).toBe(
      [
        '# context · session.login returned',
        '{',
        '  "token": "[redacted]",',
        '  "ok": true',
        '}',
      ].join('\n')
    );
    const later = call(['session.loginLater'], true) as { answer: Promise<string> };
    expect(await later.answer).toBe(
      '# context · session.loginLater returned\n{\n  "token": "[redacted]"\n}'
    );
    redacting(['session']);
    expect(call(['session.login'], true)).toBe('# context · session.login returned\n"[redacted]"');
  });

  it('passes what a call threw or rejected with through redact, and hides it if redact throws', async () => {
    const redact = jest.fn((_name: string, value: unknown) =>
      typeof value === 'string' ? value.replace('abc', '[hidden]') : value
    );
    configureRepl(true, {
      auth: {
        fail: () => {
          throw new Error('token abc expired');
        },
        failLater: () => Promise.reject(new Error('token abc expired')),
      },
    });
    // redactKeys has no key to match in a message, so `token` stays.
    configureContextRedaction({ keys: ['token'], redact });
    expect(call(['auth.fail'], true)).toBe('error: token [hidden] expired');
    expect(redact).toHaveBeenLastCalledWith('auth.fail', 'token abc expired');
    const later = call(['auth.failLater'], true) as { answer: Promise<string> };
    expect(await later.answer).toBe('error: token [hidden] expired');
    aiUsageStore.clear();
    installAgent();
    (globalThis as any).__AXONPACK_AGENT__.act({
      topic: 'context',
      action: 'call',
      args: ['auth.fail'],
      options: { yes: true },
    });
    expect(aiUsageStore.getSnapshot()[0].reply).toBe('error: token [hidden] expired');
    delete (globalThis as any).__AXONPACK_AGENT__;
    configureContextRedaction({
      redact: () => {
        throw new Error('bug in the hook');
      },
    });
    expect(call(['auth.fail'], true)).toBe('error: [redacted]');
  });

  it('logs only the redacted reply in the CLI tab', () => {
    redacting(['token']);
    aiUsageStore.clear();
    installAgent();
    const agent = (globalThis as any).__AXONPACK_AGENT__;
    agent.run({ topic: 'context', get: 'session' });
    agent.act({
      topic: 'context',
      action: 'call',
      args: ['session.login'],
      options: { yes: true },
    });
    const logged = aiUsageStore.getSnapshot();
    expect(logged).toHaveLength(2);
    for (const { reply } of logged) {
      expect(reply).toContain('[redacted]');
      expect(reply).not.toMatch(/abc|fresh|in-array|in-map/);
    }
    delete (globalThis as any).__AXONPACK_AGENT__;
  });

  it('leaves the > prompt alone', () => {
    redacting(['session', 'token'], () => '[hook]');
    expect(evaluateExpression('session.token')).toBe('abc');
    expect(evaluateExpression('session.login()')).toEqual({ token: 'fresh', ok: true });
  });
});
