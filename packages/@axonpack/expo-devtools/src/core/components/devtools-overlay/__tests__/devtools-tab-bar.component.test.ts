import { shownTabs } from '../devtools-tab-bar.component';

// The icon font pulls in expo-asset, which jest can't resolve, and no icon is drawn here.
jest.mock('@expo/vector-icons/MaterialIcons', () => () => null);

const keys = (available: Parameters<typeof shownTabs>[0]) => shownTabs(available).map((t) => t.key);

describe('shownTabs', () => {
  it('offers Preview only once preview is set up, after Redux', () => {
    expect(keys({ preview: false })).not.toContain('preview');
    const tabs = keys({ preview: true });
    expect(tabs.indexOf('preview')).toBe(tabs.indexOf('redux') + 1);
  });

  it('leaves out every tab the app has nothing for', () => {
    expect(keys({ navigation: false, query: false, redux: false, preview: false })).toEqual([
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
