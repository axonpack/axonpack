import { PANELS } from '../../../../devtools-remote-tab/constants/panels.const';
import { shownTabs } from '../devtools-tab-bar.component';

// The icon font pulls in expo-asset, which jest can't resolve, and no icon is drawn here.
jest.mock('@expo/vector-icons/MaterialIcons', () => () => null);

const keys = (...args: Parameters<typeof shownTabs>) => shownTabs(...args).map((t) => t.key);

describe('shownTabs', () => {
  it('puts each support tab before Crashes', () => {
    const tabs = keys({}, [{ id: 'extra', title: 'Extra', icon: 'rule' }]);
    expect(tabs.indexOf('extra')).toBe(tabs.indexOf('crashes') - 1);
    expect(tabs.indexOf('extra')).toBe(tabs.indexOf('redux') + 1);
  });

  it('leaves out every tab the app has nothing for', () => {
    expect(keys({ navigation: false, query: false, redux: false })).toEqual([
      'network',
      'console',
      'performance',
      'storage',
      'crashes',
      'ai-usage',
      'debug',
    ]);
  });
});

it('calls the tab CLI in the app and in React Native DevTools', () => {
  expect(shownTabs({}).find((tab) => tab.key === 'ai-usage')?.label).toBe('CLI');
  expect(PANELS.find((panel) => panel.id === 'ai-usage')?.title).toBe('CLI');
});
