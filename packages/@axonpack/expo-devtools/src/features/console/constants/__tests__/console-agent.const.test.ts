import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import { consoleLogStore, type ConsoleLogLevel } from '../../stores/console-log.store';
import { CONSOLE_AGENT } from '../console-agent.const';

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([CONSOLE_AGENT], { topic: 'console', ...rest });

function log(id: string, level: ConsoleLogLevel, text: string) {
  consoleLogStore.add({
    id,
    level,
    parts: [{ kind: 'primitive', text, tone: 'plain' }],
    text,
    timestamp: Date.now(),
    count: 1,
  });
}

beforeEach(() => {
  consoleLogStore.clear();
  consoleLogStore.setEnabled(true);
  log('c1', 'log', 'app started');
  log('c2', 'warn', 'slow image');
  log('c3', 'error', 'fetch failed: 401');
});

describe('the console topic', () => {
  it('lists lines newest first in the default columns', () => {
    expect(ask()).toBe(
      [
        '# console · 3 of 3 match',
        'id\tlevel\ttext',
        'c3\terror\tfetch failed: 401',
        'c2\twarn\tslow image',
        'c1\tlog\tapp started',
        '# next: --after c3',
      ].join('\n')
    );
  });

  it('filters on level', () => {
    expect(ask({ where: ['level=warn,error'], count: true })).toBe('2');
  });

  it('gets one line whole', () => {
    expect(JSON.parse(ask({ get: 'c2', json: true }))).toMatchObject({
      level: 'warn',
      parts: [{ text: 'slow image' }],
    });
  });

  it('says so when capture and the prompt are both off', () => {
    consoleLogStore.setEnabled(false);
    expect(ask()).toBe('# console is off: console.capture and console.repl are both off');
  });
});
