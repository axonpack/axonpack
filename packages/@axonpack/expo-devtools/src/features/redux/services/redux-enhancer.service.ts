import { reduxStore, type ReduxAction, type ReduxStoreLike } from '../stores/redux.store';

function isRecordable(action: unknown): action is ReduxAction {
  return (
    typeof action === 'object' &&
    action !== null &&
    typeof (action as { type?: unknown }).type === 'string'
  );
}

/**
 * A Redux store enhancer that feeds the Redux tab. The package takes no redux dependency, so the
 * app adds this to the store it already creates.
 *
 * Redux Toolkit:
 *
 * ```ts
 * configureStore({
 *   reducer,
 *   enhancers: (getDefaultEnhancers) => getDefaultEnhancers().concat(devtoolsReduxEnhancer()),
 * });
 * ```
 *
 * Plain `createStore`:
 *
 * ```ts
 * createStore(reducer, compose(applyMiddleware(thunk), devtoolsReduxEnhancer()));
 * ```
 *
 * Put it after `applyMiddleware`, as above. It then sees every plain action that reaches the
 * reducer, including the ones a thunk dispatches, and none of the functions the middleware already
 * handled. Until `<DevtoolsProvider />` has started with `enabled: true`, it only passes actions on.
 */
export function devtoolsReduxEnhancer() {
  return function enhance<TCreateStore extends (...args: any[]) => ReduxStoreLike>(
    createStore: TCreateStore
  ): TCreateStore {
    return ((...args: Parameters<TCreateStore>) => {
      const store = createStore(...args);
      const dispatch = (action: ReduxAction) => {
        if (!reduxStore.isEnabled() || !isRecordable(action)) return store.dispatch(action);
        const prevState = store.getState();
        const result = store.dispatch(action);
        reduxStore.record(action, prevState, store.getState());
        return result;
      };
      const enhanced = { ...store, dispatch };
      reduxStore.attach(enhanced);
      return enhanced;
    }) as TCreateStore;
  };
}
