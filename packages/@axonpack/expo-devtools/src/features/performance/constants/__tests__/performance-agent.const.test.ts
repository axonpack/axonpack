import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import { performanceStore } from '../../stores/performance.store';
import { PERFORMANCE_AGENT } from '../performance-agent.const';

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([PERFORMANCE_AGENT], { topic: 'performance', ...rest }).text;

let clock = 1_000_000;

// Once, since the store numbers its ids for the life of the module. The off test goes last.
beforeAll(() => {
  jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
  performanceStore.setEnabled(true);
  performanceStore.setPaused(false);
  performanceStore.clear();
  performanceStore.addLongTasks([{ name: 'self', duration: 210, startTime: 5 }]);
  performanceStore.addUserTiming([
    { kind: 'measure', name: 'checkout', startTime: 0, duration: 340, detail: 'cart of 3' },
  ]);
  performanceStore.addInteractions([
    { name: 'click', startTime: 9, duration: 180, processingDuration: 40 },
  ]);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('the performance topic', () => {
  it('lists long tasks, measures and interactions newest first in the default columns', () => {
    expect(ask()).toBe(
      [
        '# performance · 3 of 3 match',
        'id\tkind\tname\tms',
        'interaction-1\tinteraction\tclick\t180',
        'usertiming-1\tmeasure\tcheckout\t340',
        'longtask-1\tlongtask\tself\t210',
        '# next: --after interaction-1',
      ].join('\n')
    );
  });

  it('filters on duration', () => {
    expect(ask({ where: ['ms>200'], fields: 'id', json: true })).toBe(
      ['{"id":"usertiming-1"}', '{"id":"longtask-1"}'].join('\n')
    );
  });

  it('gets one entry whole', () => {
    expect(JSON.parse(ask({ get: 'usertiming-1', json: true }))).toMatchObject({
      kind: 'measure',
      detail: 'cart of 3',
    });
  });

  it('says the tab starts paused when it holds no rows', () => {
    performanceStore.clear();
    performanceStore.setPaused(true);
    expect(ask()).toBe(
      [
        '# performance · 0 of 0 match',
        'id\tkind\tname\tms',
        '# paused: the Performance tab records only after record is pressed',
      ].join('\n')
    );
    expect(ask({ json: true })).toBe('');
  });

  it('says so when the store is off', () => {
    performanceStore.setEnabled(false);
    expect(ask()).toBe('# performance is off: the app turned it off in its devtools config');
  });
});
