import { isDarkColor } from '../color-luminance.util';
import { BUILT_IN_THEMES } from '../../constants/theme.const';

describe('isDarkColor', () => {
  // Each theme declares its own `statusBarStyle`; this is the check that no declaration contradicts
  // the palette it belongs to, since the same reading is the fallback for a custom theme.
  it('agrees with every built-in theme about whether it is dark', () => {
    for (const [id, theme] of Object.entries(BUILT_IN_THEMES)) {
      const readsAsDark = isDarkColor(theme.palette.toolbarBackground);
      expect({ id, style: readsAsDark ? 'light' : 'dark' }).toEqual({
        id,
        style: theme.statusBarStyle,
      });
    }
  });

  it('weights green above blue, the way the eye does', () => {
    expect(isDarkColor('#0000ff')).toBe(true);
    expect(isDarkColor('#00ff00')).toBe(false);
  });

  it('accepts a short hex and ignores an alpha suffix', () => {
    expect(isDarkColor('#000')).toBe(true);
    expect(isDarkColor('#fff')).toBe(false);
    expect(isDarkColor('#202124ff')).toBe(true);
  });

  it('leaves an unparseable colour on the light-background default', () => {
    expect(isDarkColor('rgb(0, 0, 0)')).toBe(false);
    expect(isDarkColor('')).toBe(false);
  });
});
