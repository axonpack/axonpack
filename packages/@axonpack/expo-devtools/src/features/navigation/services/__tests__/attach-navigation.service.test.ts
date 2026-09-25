import {
  attachNavigationRef,
  detachNavigation,
  goBack,
  navigateTo,
  type NavigationContainerLike,
} from '../attach-navigation.service';
import {
  navigationStore,
  type NavigationRoute,
  type NavigationState,
} from '../../stores/navigation.store';

type Listener = (event: { data: unknown }) => void;

/** The two events a container emits, in the order React Navigation emits them. */
class FakeContainer implements NavigationContainerLike {
  listeners = new Map<string, Set<Listener>>();
  ready = true;
  back = true;
  navigate = jest.fn();
  goBack = jest.fn();

  constructor(
    public state: NavigationState | undefined,
    public route: NavigationRoute | undefined
  ) {}

  isReady() {
    return this.ready;
  }
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
const homeState: NavigationState = { index: 0, routes: [home] };
const detailsState: NavigationState = { index: 1, routes: [home, details] };

beforeEach(() => {
  navigationStore.reset();
  navigationStore.setEnabled(true);
});

afterEach(() => {
  detachNavigation();
  jest.useRealTimers();
});

describe('attachNavigationRef', () => {
  it('writes the state already there as the first row', () => {
    const container = new FakeContainer(homeState, home);
    attachNavigationRef({ current: container }, 'hook');

    const [first] = navigationStore.getSnapshot();
    expect(first.action).toBe('INITIAL');
    expect(first.from).toBeNull();
    expect(first.to?.name).toBe('Home');
    expect(navigationStore.isAttached()).toBe(true);
    expect(navigationStore.getAttachment()).toBe('hook');
  });

  it('listens to a container whose navigator has not mounted, and starts on its first state', () => {
    const container = new FakeContainer(undefined, undefined);
    attachNavigationRef({ current: container }, 'hook');
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
    attachNavigationRef({ current: container }, 'hook');

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
    attachNavigationRef({ current: container }, 'hook');

    container.dispatch({ type: 'NAVIGATE', payload: { name: 'Home' } }, null);

    const [row] = navigationStore.getSnapshot();
    expect(row.noop).toBe(true);
    expect(row.from?.name).toBe('Home');
    expect(row.to?.name).toBe('Home');
  });

  it('logs a state change with no action ahead of it as unknown, and skips a re-emit', () => {
    const container = new FakeContainer(homeState, home);
    attachNavigationRef({ current: container }, 'hook');

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
      'hook'
    );
    expect(navigationStore.isAttached()).toBe(false);

    throws = false;
    jest.advanceTimersByTime(250);
    expect(navigationStore.isAttached()).toBe(false);

    current = container;
    jest.advanceTimersByTime(250);
    expect(navigationStore.isAttached()).toBe(true);
    expect(navigationStore.getSnapshot()[0].action).toBe('INITIAL');
  });

  it('follows the newest container, and the one before it when that goes', () => {
    const first = new FakeContainer(homeState, home);
    const second = new FakeContainer(homeState, home);
    const detachFirst = attachNavigationRef({ current: first }, 'hook');
    const detachSecond = attachNavigationRef({ current: second }, 'hook');

    first.dispatch({ type: 'GO_BACK' }, { state: homeState, route: home });
    expect(navigationStore.getSnapshot().map((m) => m.action)).toEqual(['INITIAL', 'INITIAL']);

    detachSecond();
    expect(navigationStore.isAttached()).toBe(true);
    first.dispatch({ type: 'GO_BACK' }, { state: homeState, route: home });
    expect(navigationStore.getSnapshot()[0].action).toBe('GO_BACK');

    detachFirst();
    expect(navigationStore.isAttached()).toBe(false);
    expect(navigationStore.getAttachment()).toBeNull();
    first.dispatch({ type: 'GO_BACK' }, { state: homeState, route: home });
    expect(navigationStore.getSnapshot()[0].action).toBe('GO_BACK');
    expect(navigationStore.getSnapshot()).toHaveLength(4);
  });

  it('taking back a container that is not the one followed changes nothing', () => {
    const first = new FakeContainer(homeState, home);
    const second = new FakeContainer(homeState, home);
    const detachFirst = attachNavigationRef({ current: first }, 'hook');
    attachNavigationRef({ current: second }, 'hook');

    detachFirst();
    second.dispatch({ type: 'GO_BACK' }, { state: homeState, route: home });
    expect(navigationStore.getSnapshot()[0].action).toBe('GO_BACK');
    expect(navigationStore.isAttached()).toBe(true);
  });
});

describe('navigating from the panel', () => {
  it('says so when nothing is attached', () => {
    expect(navigateTo('Details')).toBe('No navigator is attached.');
    expect(goBack()).toBe('No navigator is attached.');
  });

  it('runs the real navigator, and refuses a back it cannot do', () => {
    const container = new FakeContainer(homeState, home);
    attachNavigationRef({ current: container }, 'hook');

    expect(navigateTo('Details', { id: 7 })).toBeNull();
    expect(container.navigate).toHaveBeenCalledWith('Details', { id: 7 });

    container.back = false;
    expect(goBack()).toBe('There is nothing to go back to.');
    container.back = true;
    expect(goBack()).toBeNull();
    expect(container.goBack).toHaveBeenCalled();
  });
});
