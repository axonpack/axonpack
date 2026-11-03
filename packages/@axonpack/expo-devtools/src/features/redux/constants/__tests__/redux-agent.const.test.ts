import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import { reduxStore } from '../../stores/redux.store';
import { REDUX_AGENT } from '../redux-agent.const';

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([REDUX_AGENT], { topic: 'redux', ...rest });

// Once, since the store numbers its ids for the life of the module. The off test goes last.
beforeAll(() => {
  reduxStore.reset();
  reduxStore.setEnabled(true);
  reduxStore.attach({ getState: () => ({}), dispatch: () => undefined });
  const empty = { todos: [] as string[] };
  const one = { todos: ['milk'] };
  reduxStore.record({ type: 'todos/add', payload: 'milk' }, empty, one);
  reduxStore.record({ type: 'user/login', payload: { id: 7 } }, one, { ...one, user: { id: 7 } });
});

describe('the redux topic', () => {
  it('lists actions newest first with the paths they changed', () => {
    expect(ask()).toBe(
      [
        '# redux · 2 of 2 match',
        'id\ttype\tchanged',
        'redux-2\tuser/login\tuser',
        'redux-1\ttodos/add\ttodos[0]',
        '# next: --after redux-2',
      ].join('\n')
    );
  });

  it('filters on the type', () => {
    expect(ask({ where: ['type~todos'], count: true })).toBe('1');
  });

  it('gets the action and its diff, not both whole states', () => {
    const row = JSON.parse(ask({ get: 'redux-2', json: true }));
    expect(row).toMatchObject({
      action: { type: 'user/login', payload: { id: 7 } },
      changes: [{ path: 'user', kind: 'added', after: { id: 7 } }],
    });
    expect(row).not.toHaveProperty('state');
    expect(row).not.toHaveProperty('prevState');
  });

  it('says so when no store uses the enhancer', () => {
    reduxStore.reset();
    expect(ask()).toBe('# redux is off: no Redux store uses devtoolsReduxEnhancer()');
  });
});
