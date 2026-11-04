import { shownPanels } from '../use-shown-panels.service';

// The icon font pulls in expo-asset, which jest can't resolve, and no icon is drawn here.
jest.mock('@expo/vector-icons/MaterialIcons', () => () => null);

const ids = (...args: Parameters<typeof shownPanels>) => shownPanels(...args).map((p) => p.id);

describe('shownPanels', () => {
  it('puts each support panel before Crashes, after Navigation', () => {
    const panels = ids({}, [{ id: 'extra', title: 'Extra', component: () => null }]);
    expect(panels.indexOf('extra')).toBe(panels.indexOf('navigation') + 1);
    expect(panels.indexOf('extra')).toBe(panels.indexOf('crashes') - 1);
  });

  it('leaves out Navigation when the app has none', () => {
    expect(ids({ navigation: false })).toEqual([
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
