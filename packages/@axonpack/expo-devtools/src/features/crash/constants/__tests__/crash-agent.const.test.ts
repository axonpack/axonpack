import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import { crashStore, type CrashRecord } from '../../stores/crash.store';
import { CRASH_AGENT } from '../crash-agent.const';

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([CRASH_AGENT], { topic: 'crash', ...rest }).text;

function crash(patch: Partial<CrashRecord> & Pick<CrashRecord, 'id'>) {
  crashStore.add({
    kind: 'js-error',
    name: 'TypeError',
    message: 'x is undefined',
    stack: 'TypeError: x is undefined\n    at render (App.tsx:10:5)',
    fromPreviousLaunch: false,
    timestamp: Date.now(),
    seen: false,
    ...patch,
  });
}

beforeEach(() => {
  crashStore.reset();
  crashStore.setEnabled(true);
  crash({ id: 'k1', kind: 'native-exception', name: 'NSException', fromPreviousLaunch: true });
  crash({ id: 'k2', route: { name: 'Checkout' } });
});

describe('the crash topic', () => {
  it('lists records newest first in the default columns', () => {
    expect(ask()).toBe(
      [
        '# crash · 2 of 2 match',
        'id\tkind\tname\tmessage',
        'k2\tjs-error\tTypeError\tx is undefined',
        'k1\tnative-exception\tNSException\tx is undefined',
        '# next: --after k2',
      ].join('\n')
    );
  });

  it('filters on the route', () => {
    expect(ask({ where: ['route=checkout'], fields: 'id' })).toBe(
      ['# crash · 1 of 2 match', 'id', 'k2', '# next: --after k2'].join('\n')
    );
  });

  it('gets the record with its stack', () => {
    expect(JSON.parse(ask({ get: 'k2', json: true })).stack).toContain('App.tsx:10:5');
  });

  it('says so when crash capture is off', () => {
    crashStore.reset();
    expect(ask()).toBe('# crash is off: crash.enabled is false');
  });
});
