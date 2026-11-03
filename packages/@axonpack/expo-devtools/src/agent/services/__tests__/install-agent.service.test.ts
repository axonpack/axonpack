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
      topics: [{ name: 'log', about: 'fake lines', rows: 1 }],
    });
    expect(agent().run({ topic: 'log' })).toBe(
      ['# log · 1 of 1 match', 'id\ttext', 'l1\thello', '# next: --after l1'].join('\n')
    );
  });

  it('says a topic is off rather than counting it', () => {
    TOPICS.push({ ...LOG, name: 'off', enabled: () => false });
    installAgent();
    expect(agent().hello().topics[1]).toEqual({ name: 'off', about: 'fake lines', rows: null });
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
