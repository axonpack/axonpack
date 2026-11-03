import { runQuery, type AgentQuery } from '../../../../agent/utils/run-query.util';
import {
  navigationStore,
  ROOT_CONTAINER,
  type NavigationMove,
} from '../../stores/navigation.store';
import { NAVIGATION_AGENT } from '../navigation-agent.const';

const ask = (rest: Partial<AgentQuery> = {}) =>
  runQuery([NAVIGATION_AGENT], { topic: 'navigation', ...rest }).text;

function move(id: string, action: string, from: string | null, to: string, params?: object) {
  const record: NavigationMove = {
    id,
    container: ROOT_CONTAINER,
    timestamp: Date.now(),
    action,
    from: from === null ? null : { key: from, name: from },
    to: { key: to, name: to, params },
    noop: false,
  };
  navigationStore.record(record);
}

beforeEach(() => {
  navigationStore.reset();
  navigationStore.setEnabled(true);
  navigationStore.setRouterKind('react-navigation');
  navigationStore.attachContainer(ROOT_CONTAINER, 'context');
  move('v1', 'INITIAL', null, 'Home');
  move('v2', 'NAVIGATE', 'Home', 'Product', { id: 42 });
  move('v3', 'GO_BACK', 'Product', 'Home');
});

describe('the navigation topic', () => {
  it('lists moves newest first in the default columns', () => {
    expect(ask()).toBe(
      [
        '# navigation · 3 of 3 match',
        'id\taction\tfrom\tto',
        'v3\tGO_BACK\tProduct\tHome',
        'v2\tNAVIGATE\tHome\tProduct',
        'v1\tINITIAL\t-\tHome',
        '# next: --after v3',
      ].join('\n')
    );
  });

  it('filters on the screen it went to', () => {
    expect(ask({ where: ['to=product'], fields: 'id,params', json: true })).toBe(
      '{"id":"v2","params":{"id":42}}'
    );
  });

  it('gets one move whole', () => {
    expect(JSON.parse(ask({ get: 'v2', json: true }))).toMatchObject({
      action: 'NAVIGATE',
      to: { name: 'Product', params: { id: 42 } },
    });
  });

  it('says so when the app has no router', () => {
    navigationStore.setRouterKind(null);
    expect(ask()).toBe('# navigation is off: no Expo Router or React Navigation found');
  });
});
