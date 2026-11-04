import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import { aiUsageStore } from '../../stores/ai-usage.store';
import { AI_USAGE_AGENT } from '../ai-usage-agent.const';

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([AI_USAGE_AGENT], { topic: 'cli', ...rest }).text;

// Once, since the store numbers its ids for the life of the module.
beforeAll(() => {
  aiUsageStore.clear();
  aiUsageStore.record(
    { topic: 'network', where: ['code>=400'] },
    { text: '# network · 1 of 9 match', matched: 1, total: 9 },
    12
  );
  aiUsageStore.record({ topic: 'nope' }, { text: 'error: unknown topic "nope"' }, 0.4);
});

describe('the cli topic', () => {
  it('lists queries newest first with matched, total and ms', () => {
    const [first, second] = aiUsageStore.getSnapshot().map((entry) => entry.id);
    expect(ask()).toBe(
      [
        '# CLI · 2 of 2 match',
        'id\tcommand\tmatched\ttotal\tms',
        `${first}\tnope\t-\t-\t0.4`,
        `${second}\tnetwork --where 'code>=400'\t1\t9\t12`,
        `# next: --after ${first}`,
      ].join('\n')
    );
  });

  it('filters on the topic and the error', () => {
    expect(ask({ where: ['topic=network'], count: true })).toBe('1');
    expect(ask({ where: ['error?'], fields: 'topic' }).split('\n')[2]).toBe('nope');
  });

  it('gets one query with its reply', () => {
    const id = aiUsageStore.getSnapshot()[1].id;
    expect(JSON.parse(ask({ get: id, json: true }))).toMatchObject({
      command: "network --where 'code>=400'",
      reply: '# network · 1 of 9 match',
    });
  });

  it('answers ai-usage, its old name, with the same rows', () => {
    const old = (rest: Partial<AgentQuery>) =>
      runQuery([AI_USAGE_AGENT], { topic: 'ai-usage', ...rest }).text;
    expect(old({})).toBe(ask());
    expect(old({ where: ['topic=network'], json: true })).toBe(
      ask({ where: ['topic=network'], json: true })
    );
    const id = aiUsageStore.getSnapshot()[1].id;
    expect(old({ get: id, json: true })).toBe(ask({ get: id, json: true }));
    expect(old({ get: id }).split('\n')[0]).toBe(`# CLI ${id}`);
  });

  it.each(['cli', 'ai-usage'])('keeps no reply for a query of %s', (topic) => {
    aiUsageStore.record({ topic }, { text: ask(), matched: 2, total: 2 }, 1);
    const [entry] = aiUsageStore.getSnapshot();
    expect(entry).toMatchObject({ topic, matched: 2, total: 2 });
    expect(entry.reply).toBeUndefined();
    expect(entry.size).toBeGreaterThan(0);
  });

  // Last, since the tests above count the two queries from beforeAll.
  it('lists actions with action?, by their name', () => {
    aiUsageStore.recordAction(
      { topic: 'network', action: 'overrides' },
      '# network · 0 overrides',
      1
    );
    expect(
      ask({ where: ['action?'], fields: 'action,command' })
        .split('\n')
        .slice(1, 3)
    ).toEqual(['action\tcommand', 'overrides\tnetwork overrides']);
    expect(ask({ where: ['action=overrides'], count: true })).toBe('1');
  });
});
