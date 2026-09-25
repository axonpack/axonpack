import {
  attachNavigationRef,
  detachNavigation,
  goBack,
  navigateTo,
  type NavigationContainerLike,
} from '../attach-navigation.service';
import {
  navigationStore,
  ROOT_CONTAINER,
  type NavigationRoute,
  type NavigationState,
} from '../../stores/navigation.store';

type Listener = (event: { data: unknown }) => void;

/** The two events a container emits, in the order React Navigation emits them. */
class FakeContainer implements NavigationContainerLike {
  listeners = new Map<string, Set<Listener>>();
  back = true;
  navigate = jest.fn();
  goBack = jest.fn();

  constructor(
    public state: NavigationState | undefined,
    public route: NavigationRoute | undefined
  ) {}

  getRootState() {
    return this.state;
  }
  getCurrentRoute() {
    return this.route;
  }
  canGoBack() {
    return this.back;
  }
  addListener(type: string, listener: Listener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
    return () => {
      set.delete(listener);
    };
  }
  emit(type: string, data: unknown) {
    for (const listener of this.listeners.get(type) ?? []) listener({ data });
  }
  dispatch(
    action: { type: string; payload?: Record<string, unknown> },
    next: { state: NavigationState; route: NavigationRoute } | null,
    stack?: string
  ) {
    this.emit('__unsafe_action__', { action, noop: next === null, stack });
    if (!next) return;
    this.state = next.state;
    this.route = next.route;
    this.emit('state', { state: next.state });
  }
}

const home: NavigationRoute = { key: 'home-1', name: 'Home' };
const details: NavigationRoute = { key: 'details-1', name: 'Details', params: { id: 7 } };
const cart: NavigationRoute = { key: 'cart-1', name: 'Cart' };
const homeState: NavigationState = { index: 0, routes: [home] };
const detailsState: NavigationState = { index: 1, routes: [home, details] };
const cartState: NavigationState = { index: 0, routes: [cart] };

function attachRoot(container: FakeContainer) {
  return attachNavigationRef({ current: container }, ROOT_CONTAINER, 'hook');
}

beforeEach(() => {
  navigationStore.reset();
  navigationStore.setEnabled(true);
});

afterEach(() => {
  detachNavigation();
  jest.useRealTimers();
});

describe('attachNavigationRef', () => {
  it('writes the state already there as the first row, under the container name', () => {
    attachRoot(new FakeContainer(homeState, home));

    const [first] = navigationStore.getSnapshot();
    expect(first.action).toBe('INITIAL');
    expect(first.container).toBe(ROOT_CONTAINER);
    expect(first.from).toBeNull();
    expect(first.to?.name).toBe('Home');
    expect(navigationStore.isAttached()).toBe(true);
    expect(navigationStore.getAttachment()).toBe('hook');
  });

  it('listens to a container whose navigator has not mounted, and starts on its first state', () => {
    const container = new FakeContainer(undefined, undefined);
    attachRoot(container);
    expect(navigationStore.isAttached()).toBe(true);
    expect(navigationStore.getSnapshot()).toEqual([]);

    container.state = homeState;
    container.route = home;
    container.emit('state', { state: homeState });

    const [first] = navigationStore.getSnapshot();
    expect(first.action).toBe('INITIAL');
    expect(first.to?.name).toBe('Home');
  });

  it('pairs the action with the state that follows it', () => {
    const container = new FakeContainer(homeState, home);
    attachRoot(container);

    container.dispatch(
      { type: 'NAVIGATE', payload: { name: 'Details', params: { id: 7 } } },
      { state: detailsState, route: details },
      'Error\n    at onPress (http://localhost:8081/index.bundle:10:5)'
    );

    const [row] = navigationStore.getSnapshot();
    expect(row.action).toBe('NAVIGATE');
    expect(row.payload).toEqual({ name: 'Details', params: { id: 7 } });
    expect(row.from?.name).toBe('Home');
    expect(row.to).toEqual({
      key: 'details-1',
      name: 'Details',
      params: { id: 7 },
      path: undefined,
    });
    expect(row.noop).toBe(false);
    expect(row.origin?.[0]).toEqual({
      fn: 'onPress',
      location: 'http://localhost:8081/index.bundle:10:5',
      vendor: false,
    });
    expect(row.state).toBe(detailsState);
  });

  it('keeps an action that changed nothing, marked as such', () => {
    const container = new FakeContainer(homeState, home);
    attachRoot(container);

    container.dispatch({ type: 'NAVIGATE', payload: { name: 'Home' } }, null);

    const [row] = navigationStore.getSnapshot();
    expect(row.noop).toBe(true);
    expect(row.from?.name).toBe('Home');
    expect(row.to?.name).toBe('Home');
  });

  it('logs a state change with no action ahead of it as unknown, and skips a re-emit', () => {
    const container = new FakeContainer(homeState, home);
    attachRoot(container);

    container.emit('state', { state: homeState });
    expect(navigationStore.getSnapshot()).toHaveLength(1);

    container.state = detailsState;
    container.route = details;
    container.emit('state', { state: detailsState });
    expect(navigationStore.getSnapshot()[0].action).toBe('UNKNOWN');
  });

  it('waits for a ref that is empty or throws, then attaches', () => {
    jest.useFakeTimers();
    const container = new FakeContainer(homeState, home);
    let current: FakeContainer | null = null;
    let throws = true;
    attachNavigationRef(
      {
        get current() {
          if (throws) throw new Error('root not mounted');
          return current;
        },
      },
      ROOT_CONTAINER,
      'expo-router'
    );
    expect(navigationStore.isAttached()).toBe(false);

    throws = false;
    jest.advanceTimersByTime(250);
    expect(navigationStore.isAttached()).toBe(false);

    current = container;
    jest.advanceTimersByTime(250);
    expect(navigationStore.isAttached()).toBe(true);
    expect(navigationStore.getAttachment()).toBe('expo-router');
    expect(navigationStore.getSnapshot()[0].action).toBe('INITIAL');
  });

  it('follows two containers at once, each row under its own name', () => {
    const root = new FakeContainer(homeState, home);
    const flow = new FakeContainer(cartState, cart);
    const detachRoot = attachRoot(root);
    const detachFlow = attachNavigationRef({ current: flow }, 'checkout', 'hook');

    root.dispatch({ type: 'NAVIGATE' }, { state: detailsState, route: details });
    flow.dispatch({ type: 'GO_BACK' }, { state: cartState, route: cart });

    const rows = navigationStore.getSnapshot().map((m) => `${m.container}:${m.action}`);
    expect(rows).toEqual(['checkout:GO_BACK', 'root:NAVIGATE', 'checkout:INITIAL', 'root:INITIAL']);
    expect(navigationStore.getFocused()).toBe('checkout');

    detachFlow();
    expect(navigationStore.getContainers().map((c) => c.name)).toEqual([ROOT_CONTAINER]);
    expect(navigationStore.getFocused()).toBe(ROOT_CONTAINER);
    flow.dispatch({ type: 'GO_BACK' }, { state: cartState, route: cart });
    expect(navigationStore.getSnapshot()).toHaveLength(4);

    detachRoot();
    expect(navigationStore.isAttached()).toBe(false);
  });

  it('treats a name handed over twice as one container', () => {
    const first = new FakeContainer(homeState, home);
    const second = new FakeContainer(homeState, home);
    const detachFirst = attachRoot(first);
    attachRoot(second);

    first.dispatch({ type: 'GO_BACK' }, { state: homeState, route: home });
    expect(navigationStore.getContainers()).toHaveLength(1);
    expect(navigationStore.getSnapshot().map((m) => m.action)).toEqual(['INITIAL', 'INITIAL']);

    // The first attachment's detach is stale and must not take the second one down.
    detachFirst();
    expect(navigationStore.isAttached()).toBe(true);
  });
});

describe('navigating from the panel', () => {
  it('says so when nothing is attached', () => {
    expect(navigateTo('Details')).toBe('No navigator is attached.');
    expect(goBack()).toBe('No navigator is attached.');
  });

  it('acts on the focused container by default, or the one named', () => {
    const root = new FakeContainer(homeState, home);
    const flow = new FakeContainer(cartState, cart);
    attachRoot(root);
    attachNavigationRef({ current: flow }, 'checkout', 'hook');

    expect(navigateTo('Address')).toBeNull();
    expect(flow.navigate).toHaveBeenCalledWith('Address', undefined);

    expect(navigateTo('Details', { id: 7 }, ROOT_CONTAINER)).toBeNull();
    expect(root.navigate).toHaveBeenCalledWith('Details', { id: 7 });

    flow.back = false;
    expect(goBack()).toBe('There is nothing to go back to.');
    expect(goBack(ROOT_CONTAINER)).toBeNull();
    expect(root.goBack).toHaveBeenCalled();
  });
});
