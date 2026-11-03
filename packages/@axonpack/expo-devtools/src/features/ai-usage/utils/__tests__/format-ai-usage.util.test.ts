import {
  formatAction,
  formatCommand,
  formatMatched,
  parseReply,
  queryInfo,
} from '../format-ai-usage.util';

describe('formatCommand', () => {
  it('writes the query back as the command line that asks it', () => {
    expect(
      formatCommand({
        topic: 'network',
        where: ['code>=400', 'url~/v1/'],
        since: '10m',
        limit: 20,
        groupBy: 'code',
        json: true,
      })
    ).toBe(
      "network --where 'code>=400' --where url~/v1/ --since 10m --limit 20 --group-by code --json"
    );
    expect(formatCommand({ topic: 'network', get: 'n212', full: true })).toBe(
      'get network n212 --full'
    );
    expect(formatCommand({ topic: 'console', grep: "it's down" })).toBe(
      "console --grep 'it'\\''s down'"
    );
  });
});

describe('formatAction', () => {
  it('writes the action back as its command line, a long body cut and no ref', () => {
    expect(
      formatAction({
        topic: 'network',
        action: 'override',
        args: ['https://api.test/me?a=1&b=2'],
        options: { status: '404', contentType: 'text/plain', body: 'gone' },
        ref: 'abc',
      })
    ).toBe(
      "network override 'https://api.test/me?a=1&b=2' --status 404 --content-type text/plain --body gone"
    );
    expect(
      formatAction({
        topic: 'network',
        action: 'send',
        args: ['POST', 'https://api.test/n'],
        options: { header: ['X-A: 1'], body: 'x'.repeat(250), yes: true },
      })
    ).toBe(
      `network send POST https://api.test/n --header 'X-A: 1' --body '${'x'.repeat(200)}... [250 chars]' --yes`
    );
    expect(formatAction({ topic: 'network', action: 'unoverride', options: { all: true } })).toBe(
      'network unoverride --all'
    );
  });

  it('marks an action in the matched column and the detail', () => {
    const entry = {
      id: 'q1',
      timestamp: 0,
      command: 'network block x',
      topic: 'network',
      action: 'block',
      duration: 1,
      size: 1,
    };
    expect(formatMatched(entry)).toBe('action');
    expect(queryInfo(entry)).toContainEqual(['Action', 'block']);
    expect(formatMatched({ matched: 1, total: 2 })).toBe('1/2');
  });
});

describe('parseReply', () => {
  it('parses get and --json replies, and leaves the rest as text', () => {
    expect(parseReply('# network n1\n{\n  "id": "n1"\n}')).toEqual({ id: 'n1' });
    expect(parseReply('{"id":"n1"}\n{"id":"n2"}')).toEqual([{ id: 'n1' }, { id: 'n2' }]);
    expect(parseReply('# network · 1 of 1 match\nid\tcode\nn1\t200')).toBeUndefined();
    expect(parseReply('6')).toBeUndefined();
    expect(parseReply('{"id":"n1"')).toBeUndefined();
  });
});
