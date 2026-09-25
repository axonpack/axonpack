import type { NavigationMove } from '../../stores/navigation.store';
import { collectRouteNames, lastParamsFor } from '../collect-route-names.util';

function move(name: string, params?: object): NavigationMove {
  return {
    id: name,
    timestamp: 0,
    action: 'NAVIGATE',
    from: null,
    to: { key: `${name}-1`, name, params },
    noop: false,
  };
}

describe('collectRouteNames', () => {
  it('walks every mounted navigator and adds what the history visited', () => {
    const state = {
      index: 0,
      routeNames: ['Tabs', 'Modal'],
      routes: [
        {
          key: 'tabs-1',
          name: 'Tabs',
          state: { index: 0, routeNames: ['Home', 'Search'], routes: [{ key: 'h', name: 'Home' }] },
        },
      ],
    };

    expect(collectRouteNames(state, [move('Details')])).toEqual([
      'Tabs',
      'Modal',
      'Home',
      'Search',
      'Details',
    ]);
  });

  it('is empty with nothing attached and nothing visited', () => {
    expect(collectRouteNames(null, [])).toEqual([]);
  });
});

describe('lastParamsFor', () => {
  it('takes the newest visit, and nothing for a route never visited', () => {
    const moves = [move('Details', { id: 2 }), move('Details', { id: 1 }), move('Home')];
    expect(lastParamsFor('Details', moves)).toEqual({ id: 2 });
    expect(lastParamsFor('Home', moves)).toBeUndefined();
    expect(lastParamsFor('Settings', moves)).toBeUndefined();
  });
});
