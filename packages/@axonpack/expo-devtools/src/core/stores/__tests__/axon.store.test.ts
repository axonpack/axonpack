import { createAxonStore } from '../axon.store';

function makeStore() {
  return createAxonStore({ count: 0, label: 'a' }, (set) => ({
    increment: () => set((state) => ({ count: state.count + 1 })),
  }));
}

describe('createAxonStore', () => {
  it('merges a patch and hands listeners the state before and after', () => {
    const store = makeStore();
    const listener = jest.fn();
    store.subscribe(listener);

    store.setState({ label: 'b' });

    expect(store.getState()).toEqual({ count: 0, label: 'b' });
    expect(listener).toHaveBeenCalledWith({ count: 0, label: 'b' }, { count: 0, label: 'a' });
  });

  it('runs updaters through the actions', () => {
    const store = makeStore();
    store.increment();
    store.increment();
    expect(store.getState().count).toBe(2);
  });

  it('wakes nobody when an updater returns the state unchanged', () => {
    const store = makeStore();
    const listener = jest.fn();
    store.subscribe(listener);

    store.setState((state) => state);

    expect(listener).not.toHaveBeenCalled();
  });

  it('replaces the whole state when asked', () => {
    const store = makeStore();
    store.setState({ count: 5, label: 'z' }, true);
    expect(store.getState()).toEqual({ count: 5, label: 'z' });
    expect(store.getInitialState()).toEqual({ count: 0, label: 'a' });
  });

  it('stops calling a listener once it unsubscribes', () => {
    const store = makeStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.increment();

    expect(listener).not.toHaveBeenCalled();
  });
});
