import { shownPanels } from '../use-shown-panels.service';

// The icon font pulls in expo-asset, which jest can't resolve, and no icon is drawn here.
jest.mock('@expo/vector-icons/MaterialIcons', () => () => null);

const ids = (available: Record<string, boolean>) => shownPanels(available).map((p) => p.id);

describe('shownPanels', () => {
  it('offers Preview only once preview is set up, after Navigation', () => {
    expect(ids({ preview: false })).not.toContain('preview');
    const panels = ids({ preview: true });
    expect(panels.indexOf('preview')).toBe(panels.indexOf('navigation') + 1);
  });

  it('leaves out Navigation and Preview when the app has neither', () => {
    expect(ids({ navigation: false, preview: false })).toEqual([
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
