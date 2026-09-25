import type { NavigationContainerInfo } from '../../stores/navigation.store';
import { flattenNavigator, hostedContainers, resolveOnScreen } from '../flatten-navigator.util';

const state = {
  type: 'stack',
  index: 1,
  routes: [
    { key: 'home-1', name: 'Home' },
    {
      key: 'tabs-1',
      name: 'Tabs',
      state: {
        type: 'tab',
        index: 1,
        routes: [
          {
            key: 'feed-1',
            name: 'Feed',
            state: { index: 0, routes: [{ key: 'x', name: 'Hidden' }] },
          },
          { key: 'search-1', name: 'Search', params: { q: 'shoes' } },
        ],
      },
    },
  ],
};

function summary(rows: ReturnType<typeof flattenNavigator>) {
  return rows.map((row) => ({
    depth: row.depth,
    kind: row.kind,
    label: row.label,
    active: row.active,
    onScreen: row.onScreen,
  }));
}

describe('flattenNavigator', () => {
  it('lists navigators and routes by depth, marks the path to the screen, and skips inactive tabs', () => {
    expect(summary(flattenNavigator(state, 'search-1'))).toEqual([
      { depth: 0, kind: 'container', label: 'root', active: true, onScreen: false },
      { depth: 0, kind: 'route', label: 'Home', active: false, onScreen: false },
      { depth: 0, kind: 'route', label: 'Tabs', active: true, onScreen: false },
      { depth: 1, kind: 'route', label: 'Feed', active: false, onScreen: false },
      { depth: 1, kind: 'route', label: 'Search', active: true, onScreen: true },
    ]);
  });

  it('runs a rail through the routes, ending at the last, and carries a parent rail past a nested block', () => {
    const rows = flattenNavigator(state, 'search-1');
    expect(rows.map((row) => row.rail)).toEqual(['none', 'through', 'end', 'through', 'end']);
    // Tabs is the last route of the root, so nothing under it needs the root's rail beside it.
    expect(rows[3].trail).toEqual([null]);

    const withMore = { ...state, routes: [...state.routes, { key: 'extra', name: 'Extra' }] };
    const nested = flattenNavigator(withMore, 'search-1').find((row) => row.label === 'Feed');
    expect(nested?.trail).toEqual(['root']);
  });

  it('files every row under the container whose track it is on', () => {
    const checkout: NavigationContainerInfo = {
      name: 'checkout',
      via: 'hook',
      hostRouteKey: 'tabs-1',
      route: { key: 'cart-1', name: 'Cart' },
      state: { index: 0, routes: [{ key: 'cart-1', name: 'Cart' }] },
    };
    const rows = flattenNavigator(state, 'search-1', hostedContainers([checkout]));
    expect(rows.find((row) => row.label === 'Search')?.container).toBe('root');
    expect(rows.find((row) => row.label === 'Cart')?.container).toBe('checkout');
  });

  it('carries the params along and keys every row', () => {
    const rows = flattenNavigator(state, undefined);
    expect(rows.find((row) => row.label === 'Search')?.params).toEqual({ q: 'shoes' });
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });

  it('hangs a container mounted in a screen under that screen, and marks both the host screen and the flow screen', () => {
    const root = {
      type: 'stack',
      index: 1,
      routes: [
        { key: 'home-1', name: 'Home' },
        { key: 'checkout-1', name: 'Checkout' },
      ],
    };
    const checkout: NavigationContainerInfo = {
      name: 'checkout',
      via: 'hook',
      hostRouteKey: 'checkout-1',
      route: { key: 'cart-1', name: 'Cart' },
      state: { type: 'stack', index: 0, routes: [{ key: 'cart-1', name: 'Cart' }] },
    };
    const hosted = hostedContainers([checkout]);

    expect(summary(flattenNavigator(root, 'checkout-1', hosted))).toEqual([
      { depth: 0, kind: 'container', label: 'root', active: true, onScreen: false },
      { depth: 0, kind: 'route', label: 'Home', active: false, onScreen: false },
      { depth: 0, kind: 'route', label: 'Checkout', active: true, onScreen: true },
      { depth: 1, kind: 'container', label: 'checkout', active: true, onScreen: false },
      { depth: 1, kind: 'route', label: 'Cart', active: true, onScreen: true },
    ]);
  });
});

describe('resolveOnScreen', () => {
  it('follows the screen down through hosted containers', () => {
    const root: NavigationContainerInfo = {
      name: 'root',
      via: 'context',
      route: { key: 'checkout-1', name: 'Checkout' },
      state: null,
    };
    const checkout: NavigationContainerInfo = {
      name: 'checkout',
      via: 'hook',
      hostRouteKey: 'checkout-1',
      route: { key: 'cart-1', name: 'Cart' },
      state: null,
    };
    const hosted = hostedContainers([root, checkout]);
    expect(resolveOnScreen(root, hosted)).toBe(checkout);
    expect(resolveOnScreen(checkout, hosted)).toBe(checkout);
  });
});

describe('a container hosted by a past screen', () => {
  const root = {
    type: 'stack',
    index: 1,
    routes: [
      { key: 'checkout-1', name: 'Checkout' },
      { key: 'details-1', name: 'Details' },
    ],
  };
  const checkout: NavigationContainerInfo = {
    name: 'checkout',
    via: 'hook',
    hostRouteKey: 'checkout-1',
    route: { key: 'cart-1', name: 'Cart' },
    state: { index: 0, routes: [{ key: 'cart-1', name: 'Cart' }] },
  };
  const hosted = hostedContainers([checkout]);

  it('is closed by default, and marked on its host so it can be opened', () => {
    const rows = flattenNavigator(root, 'details-1', hosted);
    const host = rows.find((row) => row.label === 'Checkout');
    expect(host?.hosts).toBe('checkout');
    expect(host?.open).toBe(false);
    expect(rows.some((row) => row.label === 'Cart')).toBe(false);
  });

  it('opens when its host row is toggled', () => {
    const rows = flattenNavigator(
      root,
      'details-1',
      hosted,
      0,
      'nav',
      [],
      'root',
      true,
      new Map([['nav/checkout-1', { open: true, from: false }]])
    );
    expect(rows.find((row) => row.label === 'Checkout')?.open).toBe(true);
    expect(rows.find((row) => row.label === 'Cart')?.container).toBe('checkout');
    // Mounted under a past screen, so not what the person sees.
    expect(rows.filter((row) => row.onScreen).map((row) => row.label)).toEqual(['Details']);
  });
});

describe('a host coming back on screen', () => {
  it('opens even after it was opened by hand while it was a past screen', () => {
    const root = {
      type: 'stack',
      index: 0,
      routes: [{ key: 'checkout-1', name: 'Checkout' }],
    };
    const checkout: NavigationContainerInfo = {
      name: 'checkout',
      via: 'hook',
      hostRouteKey: 'checkout-1',
      route: { key: 'cart-1', name: 'Cart' },
      state: { index: 0, routes: [{ key: 'cart-1', name: 'Cart' }] },
    };
    const openedWhilePast = new Map([['nav/checkout-1', { open: true, from: false }]]);
    const rows = flattenNavigator(
      root,
      'checkout-1',
      hostedContainers([checkout]),
      0,
      'nav',
      [],
      'root',
      true,
      openedWhilePast
    );

    expect(rows.find((row) => row.label === 'Checkout')?.open).toBe(true);
    expect(rows.find((row) => row.label === 'Cart')?.onScreen).toBe(true);
  });
});
