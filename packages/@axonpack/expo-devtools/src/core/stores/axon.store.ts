import { useCallback, useDebugValue, useSyncExternalStore } from 'react';

type SetState<State> = {
  (partial: Partial<State> | ((state: State) => Partial<State>), replace?: false): void;
  (state: State | ((state: State) => State), replace: true): void;
};

type Listener<State> = (state: State, previousState: State) => void;

const identity = <T>(value: T) => value;

/**
 * The base every snapshot store is built on. Same semantics as zustand's `createStore` and
 * `useStore`, kept in the package so consumers install nothing for it. One difference on purpose:
 * actions live on the store object, not in the state, so `getState()` is plain data.
 *
 * `useStore` takes an optional selector. It must return a value already in the state, never a
 * fresh object, or React re-renders for ever.
 */
export function createAxonStore<State extends object, Actions extends object>(
  initial: State,
  actions: (set: SetState<State>, get: () => State) => Actions
) {
  let state = initial;
  const listeners = new Set<Listener<State>>();

  const getState = () => state;
  const getInitialState = () => initial;
  const setState: SetState<State> = (
    partial: Partial<State> | ((state: State) => Partial<State>),
    replace?: boolean
  ) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    // An updater that hands the state back unchanged is a no-op, and wakes nobody.
    if (Object.is(next, state)) return;
    const previousState = state;
    state = replace ? (next as State) : { ...state, ...next };
    for (const listener of listeners) listener(state, previousState);
  };
  const subscribe = (listener: Listener<State>) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  function useStore(): State;
  function useStore<Selected>(select: (state: State) => Selected): Selected;
  function useStore<Selected>(
    select: (state: State) => Selected = identity as (state: State) => Selected
  ) {
    const slice = useSyncExternalStore(
      subscribe,
      useCallback(() => select(state), [select]),
      // What a server render reads. Without it, `useSyncExternalStore` throws there.
      useCallback(() => select(initial), [select])
    );
    useDebugValue(slice);
    return slice;
  }

  return {
    getState,
    getInitialState,
    setState,
    subscribe,
    useStore,
    ...actions(setState, getState),
  };
}

/**
 * The hook for a store that keeps its own internals: a ring buffer, a batched notify. Pass the
 * store's `subscribe`, then read with any of its getters: `useConsoleLogStore(consoleLogStore.isPaused)`.
 */
export function createStoreHook(subscribe: (listener: () => void) => () => void) {
  return function useStore<T>(select: () => T): T {
    return useSyncExternalStore(subscribe, select);
  };
}
