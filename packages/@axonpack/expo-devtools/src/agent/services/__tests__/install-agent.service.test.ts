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

afterEach(() => {
  delete (globalThis as any).__AXONPACK_AGENT__;
  TOPICS.length = 0;
});

describe('installAgent', () => {
  it('puts hello and run on the global', () => {
    installAgent();
    TOPICS.push(LOG);

    expect(agent().hello()).toEqual({
      version: require('../../../../package.json').version,
      slug: 'my-app',
      name: 'My App',
      platform: Platform.OS,
      topics: ['log'],
    });
    expect(agent().run({ topic: 'log' })).toBe(
      ['# log · 1 of 1 match', 'id\ttext', 'l1\thello', '# next: --after l1'].join('\n')
    );
  });

  it('answers a bad query with an error line', () => {
    installAgent();
    expect(agent().run({ topic: 'network' })).toBe(
      'error: unknown topic "network". Topics: none yet'
    );
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
