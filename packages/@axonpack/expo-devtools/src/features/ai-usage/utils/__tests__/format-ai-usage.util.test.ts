import { formatCommand, parseReply } from '../format-ai-usage.util';

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

describe('parseReply', () => {
  it('parses get and --json replies, and leaves the rest as text', () => {
    expect(parseReply('# network n1\n{\n  "id": "n1"\n}')).toEqual({ id: 'n1' });
    expect(parseReply('{"id":"n1"}\n{"id":"n2"}')).toEqual([{ id: 'n1' }, { id: 'n2' }]);
    expect(parseReply('# network · 1 of 1 match\nid\tcode\nn1\t200')).toBeUndefined();
    expect(parseReply('6')).toBeUndefined();
    expect(parseReply('{"id":"n1"')).toBeUndefined();
  });
});
