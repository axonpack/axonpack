import { Platform } from 'react-native';

import { AI_USAGE_AGENT } from '../../../features/ai-usage/constants/ai-usage-agent.const';
import { aiUsageStore } from '../../../features/ai-usage/stores/ai-usage.store';
import { TOPICS, type AgentTopic } from '../../constants/agent-topics.const';
import { installAgent } from '../install-agent.service';

jest.mock(
  'expo-constants',
  () => ({ __esModule: true, default: { expoConfig: { slug: 'my-app', name: 'My App' } } }),
  { virtual: true }
);

const agent = () => (globalThis as any).__AXONPACK_AGENT__;

const LOG: AgentTopic<{ id: string; t: number; text: string }> = {
  name: 'log',
  about: 'fake lines',
  rows: () => [{ id: 'l1', t: 0, text: 'hello' }],
  fields: { id: (r) => r.id, t: (r) => r.t, text: (r) => r.text },
  show: ['id', 'text'],
};

const REAL_TOPICS = [...TOPICS];
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  TOPICS.splice(0, TOPICS.length, LOG);
});

afterEach(() => {
  delete (globalThis as any).__AXONPACK_AGENT__;
});

afterAll(() => {
  TOPICS.splice(0, TOPICS.length, ...REAL_TOPICS);
});

it('lists one topic per feature', () => {
  expect(REAL_TOPICS.map((topic) => topic.name)).toEqual([
    'network',
    'console',
    'performance',
    'storage',
    'query',
    'navigation',
    'redux',
    'crash',
    'ai-usage',
  ]);
});

describe('installAgent', () => {
  it('puts hello and run on the global', () => {
    installAgent();

    expect(agent().hello()).toEqual({
      version: require('../../../../package.json').version,
      slug: 'my-app',
      name: 'My App',
      platform: Platform.OS,
      topics: [{ name: 'log', about: 'fake lines', rows: 1, actions: [] }],
    });
    expect(agent().run({ topic: 'log' })).toBe(
      ['# log · 1 of 1 match', 'id\ttext', 'l1\thello', '# next: --after l1'].join('\n')
    );
  });

  it('says a topic is off rather than counting it', () => {
    TOPICS.push({ ...LOG, name: 'off', enabled: () => false });
    installAgent();
    expect(agent().hello().topics[1]).toEqual({
      name: 'off',
      about: 'fake lines',
      rows: null,
      actions: [],
    });
  });

  it('answers a bad query with an error line', () => {
    installAgent();
    expect(agent().run({ topic: 'nope' })).toBe('error: unknown topic "nope". Topics: log');
  });

  it('records each query with its reply for the AI Usage tab, and never hello', () => {
    aiUsageStore.clear();
    installAgent();
    agent().hello();
    const reply = agent().run({ topic: 'log', where: ['text~hell'] });

    expect(aiUsageStore.getSnapshot()).toEqual([
      expect.objectContaining({
        command: 'log --where text~hell',
        topic: 'log',
        matched: 1,
        total: 1,
        size: reply.length,
        reply,
      }),
    ]);
  });

  it('records the answer a wait ends on, not every wait', () => {
    aiUsageStore.clear();
    let waiting = true;
    TOPICS.push({ ...LOG, name: 'slow', prepare: () => (waiting ? 'reading' : undefined) });
    installAgent();
    expect(agent().run({ topic: 'slow' })).toBe('# wait: reading');
    expect(aiUsageStore.getSnapshot()).toEqual([]);
    waiting = false;
    agent().run({ topic: 'slow' });
    expect(aiUsageStore.getSnapshot()).toHaveLength(1);
  });

  it('records a query of ai-usage without its reply', () => {
    aiUsageStore.clear();
    TOPICS.push(AI_USAGE_AGENT);
    installAgent();
    agent().run({ topic: 'log' });
    const reply = agent().run({ topic: 'ai-usage' });

    expect(reply).toContain('log');
    const [entry] = aiUsageStore.getSnapshot();
    expect(entry).toMatchObject({ topic: 'ai-usage', matched: 1, total: 1, size: reply.length });
    expect(entry.reply).toBeUndefined();
  });

  describe('act', () => {
    let lines: string[];
    let finish: (text: string) => void;
    const ACTIONS: AgentTopic['actions'] = {
      add: {
        usage: '<text>',
        args: [1, 1],
        run: ([text]) => {
          lines.push(text);
          return `# log · added ${text}`;
        },
      },
      slow: {
        usage: "[--header 'Name: value']",
        args: [0, 0],
        options: ['header'],
        run: () => ({
          waitingFor: 'sending',
          answer: new Promise<string>((resolve) => {
            finish = resolve;
          }),
        }),
      },
    };

    beforeEach(() => {
      lines = [];
      aiUsageStore.clear();
      TOPICS.splice(0, TOPICS.length, { ...LOG, actions: ACTIONS });
      installAgent();
    });

    it("lists a topic's actions in hello", () => {
      expect(agent().hello().topics[0].actions).toEqual(['add', 'slow']);
    });

    it('runs an action and records it in AI Usage, marked as one', () => {
      const reply = agent().act({ topic: 'log', action: 'add', args: ['hi there'] });

      expect(reply).toBe('# log · added hi there');
      expect(lines).toEqual(['hi there']);
      expect(aiUsageStore.getSnapshot()).toEqual([
        expect.objectContaining({
          command: "log add 'hi there'",
          topic: 'log',
          action: 'add',
          reply,
          size: reply.length,
        }),
      ]);
    });

    it('answers a wait until the action is done, records it once, and never runs it twice', async () => {
      const call = { topic: 'log', action: 'slow', ref: 'r1' };
      expect(agent().act(call)).toBe('# wait: sending');
      expect(agent().act(call)).toBe('# wait: sending');
      expect(aiUsageStore.getSnapshot()).toEqual([]);

      finish('# log · sent');
      await settle();
      expect(aiUsageStore.getSnapshot()).toEqual([
        expect.objectContaining({ action: 'slow', reply: '# log · sent' }),
      ]);
      expect(agent().act(call)).toBe('# log · sent');
      // Asked for once, so the same call now starts a new one.
      expect(agent().act(call)).toBe('# wait: sending');
    });

    it('masks a secret header in the recorded command', async () => {
      agent().act({
        topic: 'log',
        action: 'slow',
        options: { header: ['Authorization: Bearer SECRET', 'X-Debug: 1'] },
      });
      finish('# log · sent');
      await settle();
      const [entry] = aiUsageStore.getSnapshot();
      expect(entry.command).toBe(
        "log slow --header 'Authorization: [redacted]' --header 'X-Debug: 1'"
      );
    });

    it.each([
      [{ topic: 'nope', action: 'add' }, 'error: unknown topic "nope". Topics: log'],
      [{ topic: 'log', action: 'drop' }, 'error: log has no action "drop". Actions: add, slow'],
      [
        { topic: 'log', action: 'toString' },
        'error: log has no action "toString". Actions: add, slow',
      ],
      [{ topic: 'log', action: 'add' }, 'error: usage: devtools log add <text>'],
      [{ topic: 'log', action: 'add', args: ['a', 'b'] }, 'error: usage: devtools log add <text>'],
      [
        { topic: 'log', action: 'add', args: ['a'], options: { yes: true } },
        'error: log add takes no --yes. usage: devtools log add <text>',
      ],
      [
        { topic: 'log', action: 'slow', options: { header: 'X: 1' } },
        "error: bad --header. usage: devtools log slow [--header 'Name: value']",
      ],
    ])('answers %j with one error line, and records it', (call, error) => {
      expect(agent().act(call)).toBe(error);
      expect(lines).toEqual([]);
      expect(aiUsageStore.getSnapshot()[0]).toMatchObject({ error: error.slice(7) });
    });

    it('says a topic without actions has none, and an off topic is off', () => {
      TOPICS.push(
        { ...LOG, name: 'plain' },
        { ...LOG, name: 'off', enabled: () => false, actions: ACTIONS }
      );
      expect(agent().act({ topic: 'plain', action: 'add' })).toBe(
        'error: plain has no actions, only queries'
      );
      expect(agent().act({ topic: 'off', action: 'add', args: ['x'] })).toBe(
        'error: off is off: the app turned it off in its devtools config'
      );
    });
  });

  it('does nothing outside a dev build', () => {
    const dev = (globalThis as any).__DEV__;
    (globalThis as any).__DEV__ = false;
    try {
      installAgent();
    } finally {
      (globalThis as any).__DEV__ = dev;
    }
    expect(agent()).toBeUndefined();
  });
});
