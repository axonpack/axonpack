import { Platform } from 'react-native';

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
