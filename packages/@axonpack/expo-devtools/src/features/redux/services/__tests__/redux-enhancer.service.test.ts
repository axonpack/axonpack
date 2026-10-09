import { reduxStore, type ReduxAction } from '../../stores/redux.store';
import { devtoolsReduxEnhancer } from '../redux-enhancer.service';

type State = { count: number };

// The smallest store with redux's contract, so the test needs no redux install.
function createStore(reducer: (state: State | undefined, action: ReduxAction) => State) {
  let state = reducer(undefined, { type: '@@INIT' });
  return {
    getState: () => state,
    dispatch: (action: ReduxAction) => {
      state = reducer(state, action);
      return action;
    },
    subscribe: () => () => {},
  };
}

function reducer(state: State = { count: 0 }, action: ReduxAction): State {
  if (action.type === 'inc') return { count: state.count + 1 };
  if (action.type === 'boom') throw new Error('reducer failed');
  return state;
}

beforeEach(() => {
  reduxStore.reset();
});

describe('devtoolsReduxEnhancer', () => {
  it('passes actions through and records nothing before the start', () => {
    const store = devtoolsReduxEnhancer()(createStore)(reducer);
    store.dispatch({ type: 'inc' });

    expect(store.getState()).toEqual({ count: 1 });
    expect(reduxStore.isAttached()).toBe(true);
    expect(reduxStore.getSnapshot()).toEqual([]);
  });

  it('records each action with the state before and after', () => {
    const store = devtoolsReduxEnhancer()(createStore)(reducer);
    reduxStore.setEnabled(true);
    store.dispatch({ type: 'inc', payload: 5 });
    store.dispatch({ type: 'noop' });

    const [noop, inc] = reduxStore.getSnapshot();
    expect(inc.action).toEqual({ type: 'inc', payload: 5 });
    expect(inc.prevState).toEqual({ count: 0 });
    expect(inc.state).toEqual({ count: 1 });
    expect(noop.prevState).toBe(noop.state);
    expect(reduxStore.getCurrentState()).toEqual({ count: 1 });
  });

  it('ignores what is not a plain action, as a thunk would be if it got this far', () => {
    const inner = { getState: () => 1, dispatch: jest.fn(() => 'thunk result') };
    const store = devtoolsReduxEnhancer()(() => inner)();
    reduxStore.setEnabled(true);

    expect(store.dispatch((() => {}) as unknown as ReduxAction)).toBe('thunk result');
    expect(reduxStore.getSnapshot()).toEqual([]);
  });

  it('honours pause and the lists, and the panel can deny a type', () => {
    const store = devtoolsReduxEnhancer()(createStore)(reducer);
    reduxStore.setEnabled(true);
    reduxStore.setActionLists({ deny: [/^no/] });
    store.dispatch({ type: 'noop' });
    reduxStore.denyType('inc');
    store.dispatch({ type: 'inc' });
    reduxStore.removeDenied('inc');
    reduxStore.setPaused(true);
    store.dispatch({ type: 'inc' });

    expect(reduxStore.getSnapshot()).toEqual([]);
    expect(reduxStore.getCurrentState()).toEqual({ count: 2 });
  });

  it('dispatches from the panel through the store, and reports a reducer error', () => {
    const store = devtoolsReduxEnhancer()(createStore)(reducer);
    reduxStore.setEnabled(true);

    expect(reduxStore.dispatch({ type: 'inc' })).toBeNull();
    expect(store.getState()).toEqual({ count: 1 });
    expect(reduxStore.getSnapshot()).toHaveLength(1);
    expect(reduxStore.dispatch({ type: 'boom' })).toBe('reducer failed');
  });
});
