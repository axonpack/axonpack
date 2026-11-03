import { aiUsageStore } from '../ai-usage.store';

const ask = (topic: string, text = 'ok') => aiUsageStore.record({ topic }, { text }, 1);

beforeEach(() => {
  aiUsageStore.clear();
  aiUsageStore.setPaused(false);
});

describe('aiUsageStore', () => {
  it('keeps the newest 100, newest first', () => {
    for (let i = 0; i < 105; i++) ask(`t${i}`);
    const entries = aiUsageStore.getSnapshot();
    expect(entries).toHaveLength(100);
    expect(entries[0].topic).toBe('t104');
    expect(entries[99].topic).toBe('t5');
  });

  it('keeps nothing while paused', () => {
    aiUsageStore.setPaused(true);
    ask('network');
    expect(aiUsageStore.getSnapshot()).toEqual([]);
    aiUsageStore.setPaused(false);
    ask('network');
    expect(aiUsageStore.getSnapshot()).toHaveLength(1);
  });

  it('clears', () => {
    ask('network');
    aiUsageStore.clear();
    expect(aiUsageStore.getSnapshot()).toEqual([]);
  });

  it('cuts a long reply and keeps its whole size', () => {
    ask('network', 'x'.repeat(70_000));
    const [entry] = aiUsageStore.getSnapshot();
    expect(entry.reply).toHaveLength(64 * 1024);
    expect(entry).toMatchObject({ size: 70_000, cut: true });
  });

  it('records an action marked as one, with its command, reply and error', () => {
    aiUsageStore.recordAction(
      { topic: 'network', action: 'block', args: ['https://x.test/a'], ref: 'r1' },
      '# network · blocking https://x.test/a',
      0.84
    );
    aiUsageStore.recordAction(
      { topic: 'network', action: 'send', args: ['POST', 'https://x.test/a'] },
      'error: POST can change data on the server, so it needs --yes',
      0.1
    );

    const [refused, blocked] = aiUsageStore.getSnapshot();
    expect(blocked).toMatchObject({
      command: 'network block https://x.test/a',
      topic: 'network',
      action: 'block',
      duration: 0.8,
      reply: '# network · blocking https://x.test/a',
    });
    expect(blocked.matched).toBeUndefined();
    expect(refused).toMatchObject({
      action: 'send',
      error: 'POST can change data on the server, so it needs --yes',
    });
  });

  it('pulls the message out of an error reply', () => {
    ask('nope', 'error: unknown topic "nope"');
    expect(aiUsageStore.getSnapshot()[0].error).toBe('unknown topic "nope"');
  });
});
