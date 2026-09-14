import { panelVisibilityStore } from '../panel-visibility.store';

afterEach(() => {
  panelVisibilityStore.hide();
});

describe('panelVisibilityStore', () => {
  it('opens, closes and toggles', () => {
    expect(panelVisibilityStore.isOpen()).toBe(false);

    panelVisibilityStore.show();
    expect(panelVisibilityStore.isOpen()).toBe(true);

    panelVisibilityStore.toggle();
    expect(panelVisibilityStore.isOpen()).toBe(false);
  });

  /** `useSyncExternalStore` re-reads on notify, so a redundant one is a wasted render of the panel. */
  it('notifies only when the value actually changed', () => {
    const listener = jest.fn();
    const unsubscribe = panelVisibilityStore.subscribe(listener);

    panelVisibilityStore.show();
    panelVisibilityStore.show();
    expect(listener).toHaveBeenCalledTimes(1);

    panelVisibilityStore.hide();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
