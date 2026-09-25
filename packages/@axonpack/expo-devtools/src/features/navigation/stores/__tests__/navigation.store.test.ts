import { navigationStore, ROOT_CONTAINER, type NavigationMove } from '../navigation.store';

let sequence = 0;

function move(patch: Partial<NavigationMove> = {}): NavigationMove {
  sequence += 1;
  return {
    id: `m-${sequence}`,
    container: ROOT_CONTAINER,
    timestamp: sequence,
    action: 'NAVIGATE',
    from: null,
    to: { key: 'k', name: 'Home' },
    noop: false,
    ...patch,
  };
}

beforeEach(() => {
  sequence = 0;
  navigationStore.reset();
  navigationStore.setEnabled(true);
  navigationStore.attachContainer(ROOT_CONTAINER, 'context');
});

describe('navigationStore.record', () => {
  it('records nothing until the store is enabled', () => {
    navigationStore.reset();
    navigationStore.record(move());
    expect(navigationStore.getSnapshot()).toEqual([]);
    expect(navigationStore.getCurrentRoute()).toBeNull();
  });

  it('keeps newest first and the route on screen in step', () => {
    navigationStore.record(move({ to: { key: 'a', name: 'Home' } }));
    navigationStore.record(move({ to: { key: 'b', name: 'Details', path: '/details/1' } }));

    expect(navigationStore.getSnapshot().map((m) => m.to?.name)).toEqual(['Details', 'Home']);
    expect(navigationStore.getCurrentRoute()?.path).toBe('/details/1');
  });

  it('follows the route while paused, without adding to the history', () => {
    navigationStore.record(move({ to: { key: 'a', name: 'Home' } }));
    navigationStore.setPaused(true);
    navigationStore.record(move({ to: { key: 'b', name: 'Details' } }));

    expect(navigationStore.getSnapshot()).toHaveLength(1);
    expect(navigationStore.getCurrentRoute()?.name).toBe('Details');
  });

  it('runs the redaction hook before anything is stored, the current route included', () => {
    navigationStore.setRedaction((next) =>
      next.to ? { ...next, to: { ...next.to, params: { token: '[redacted]' } } } : next
    );
    navigationStore.record(move({ to: { key: 'a', name: 'Login', params: { token: 'secret' } } }));

    expect(navigationStore.getSnapshot()[0].to?.params).toEqual({ token: '[redacted]' });
    expect(navigationStore.getCurrentRoute()?.params).toEqual({ token: '[redacted]' });
  });

  it('drops the move when the hook returns null or throws', () => {
    navigationStore.setRedaction(() => null);
    navigationStore.record(move());
    navigationStore.setRedaction(() => {
      throw new Error('boom');
    });
    navigationStore.record(move());

    expect(navigationStore.getSnapshot()).toEqual([]);
    expect(navigationStore.getCurrentRoute()).toBeNull();
  });

  it('keeps the most recent 200', () => {
    for (let index = 0; index < 205; index += 1) navigationStore.record(move());
    expect(navigationStore.getSnapshot()).toHaveLength(200);
    expect(navigationStore.getSnapshot()[0].id).toBe('m-205');
  });
});

describe('containers', () => {
  it('follows every container, with the one that moved last in focus', () => {
    navigationStore.attachContainer('checkout', 'hook');
    expect(navigationStore.getFocused()).toBe('checkout');

    navigationStore.record(move({ container: ROOT_CONTAINER, to: { key: 'a', name: 'Home' } }));
    expect(navigationStore.getFocused()).toBe(ROOT_CONTAINER);
    expect(navigationStore.getCurrentRoute()?.name).toBe('Home');

    navigationStore.record(move({ container: 'checkout', to: { key: 'c', name: 'Cart' } }));
    expect(navigationStore.getFocused()).toBe('checkout');
    expect(navigationStore.getCurrentRoute()?.name).toBe('Cart');
    expect(navigationStore.getAttachment()).toBe('hook');

    navigationStore.setFocused(ROOT_CONTAINER);
    expect(navigationStore.getCurrentRoute()?.name).toBe('Home');
    expect(navigationStore.getAttachment()).toBe('context');
  });

  it('hands focus to the container left when the focused one goes', () => {
    navigationStore.attachContainer('checkout', 'hook');
    navigationStore.detachContainer('checkout');
    expect(navigationStore.getFocused()).toBe(ROOT_CONTAINER);

    navigationStore.detachContainer(ROOT_CONTAINER);
    expect(navigationStore.isAttached()).toBe(false);
    expect(navigationStore.getFocused()).toBeNull();
  });

  it('treats a name attached twice as one container', () => {
    navigationStore.attachContainer(ROOT_CONTAINER, 'hook');
    expect(navigationStore.getContainers()).toHaveLength(1);
    expect(navigationStore.getAttachment()).toBe('hook');
  });
});
