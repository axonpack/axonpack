import { parseArgv } from '../parse-argv.util';

describe('parseArgv', () => {
  it('turns every query flag into the query the app runs', () => {
    const args = parseArgv([
      'network',
      '--grep',
      '/time?out/i',
      '--where',
      'code>=400',
      '--where=method=GET,POST',
      '--since',
      '10m',
      '--until',
      '2026-11-03T10:00:00Z',
      '--after',
      'n1',
      '--before',
      'n9',
      '--limit',
      '20',
      '--sort',
      '-ms',
      '--fields',
      'id,url',
      '--count',
      '--group-by',
      'code',
      '--full',
      '--json',
    ]);

    expect(args.words).toEqual(['network']);
    expect(args.query).toEqual({
      grep: '/time?out/i',
      where: ['code>=400', 'method=GET,POST'],
      since: '10m',
      until: '2026-11-03T10:00:00Z',
      after: 'n1',
      before: 'n9',
      limit: 20,
      sort: '-ms',
      fields: 'id,url',
      count: true,
      groupBy: 'code',
      full: true,
      json: true,
    });
  });

  it('keeps the app flags out of the query', () => {
    const args = parseArgv([
      'get',
      'network',
      'n1',
      '--app',
      'my-app',
      '--device=Pixel',
      '--port',
      '8082',
      '--out',
      'row.json',
      '--force',
    ]);

    expect(args).toEqual({
      words: ['get', 'network', 'n1'],
      query: {},
      app: 'my-app',
      device: 'Pixel',
      port: 8082,
      out: 'row.json',
      force: true,
      help: false,
    });
  });

  it('reads --help and -h anywhere', () => {
    expect(parseArgv(['network', '-h']).help).toBe(true);
    expect(parseArgv(['--help']).help).toBe(true);
  });

  it.each([
    [['--nope'], 'unknown flag --nope. See devtools --help'],
    [['-x'], 'unknown flag -x. See devtools --help'],
    [['network', '--where'], '--where needs a value'],
    [['network', '--limit', 'ten'], 'bad --limit ten: use a whole number from 1'],
    [['network', '--limit', '0'], 'bad --limit 0: use a whole number from 1'],
    [['apps', '--port', '80.5'], 'bad --port 80.5: use a whole number from 1'],
  ])('rejects %j', (argv, message) => {
    expect(() => parseArgv(argv)).toThrow(message);
  });
});
