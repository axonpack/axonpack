import type { Palette } from '../../core/constants/theme.const';
import { isDarkColor } from '../../core/utils/color-luminance.util';

/**
 * The app's theme as the tab page's colour variables, so a theme picked in either place paints both.
 *
 * It overrides the variables the tab package's page sets for DevTools light and dark, and the Network
 * panel's own, with selectors one step more specific so it wins whatever order the styles load in.
 * The bar gets the chrome's text colours, as the in-app header does, since a theme is free to give
 * its header a different lightness from its panel. Menus and the about card open from the bar sit on
 * the panel's surface, so they take the panel's text back.
 */
/**
 * The Axonpack mark from the tab package's page, recoloured: its blue takes the theme's accent and
 * its other stroke takes the text it sits among. The package ships only a DevTools-light and a
 * DevTools-dark copy, and either can be wrong against a theme the app picked.
 */
function logo(accent: string, stroke: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>` +
    `<g fill='none' stroke-width='60' stroke-linecap='round'>` +
    `<path d='M199 112 95 287' stroke='${accent}'/><path d='M243 165 304 287' stroke='${stroke}'/>` +
    `</g><circle cx='201' cy='264' r='29' fill='${accent}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function themeCss(palette: Palette): string {
  const mix = (color: string, percent: number, over = 'transparent') =>
    `color-mix(in srgb, ${color} ${percent}%, ${over})`;

  return `
:root:root {
  color-scheme: ${isDarkColor(palette.background) ? 'dark' : 'light'};
  --bg: ${palette.background};
  --fg: ${palette.textPrimary};
  --bar: ${palette.toolbarBackground};
  --line: ${palette.border};
  --hover: ${mix(palette.textPrimary, 10)};
  --pop: ${palette.surface};
  --muted: ${palette.textSecondary};
  --link: ${palette.accent};
}
:root .axonpack-tab-name,
:root .axonpack-panel-tabs,
:root .axonpack-theme,
:root .axonpack-tab-bar > button {
  --fg: ${palette.toolbarTextActive};
  --muted: ${palette.toolbarText};
  --link: ${palette.toolbarTextActive};
  --hover: ${mix(palette.toolbarText, 14)};
  --logo: ${logo(palette.toolbarTextActive, palette.toolbarText)};
}
/* Set, not inherited: the name's colour comes down from \`body\`, already worked out from the panel's
   text before the variables above apply here. */
:root .axonpack-tab-name {
  color: var(--fg);
}
:root .axonpack-panel-menu,
:root .axonpack-theme-menu,
:root .axonpack-tab-about {
  --fg: ${palette.textPrimary};
  --muted: ${palette.textSecondary};
  --hover: ${mix(palette.textPrimary, 10)};
  --logo: ${logo(palette.accent, palette.textPrimary)};
}
:root .axonpack-net {
  --net-icon: ${palette.textSecondary};
  --net-red: ${palette.error};
  --net-tonal: ${mix(palette.accent, 25, palette.background)};
  --net-on-tonal: ${palette.textPrimary};
  --net-outline: ${palette.border};
  --net-ov-total: ${palette.surface};
  --net-ov-waiting: ${palette.success};
  --net-ov-receiving: ${palette.accent};
  --net-ov-window: ${mix(palette.accent, 30)};
  --net-section: ${palette.sectionTint};
  --net-success: ${palette.success};
  --net-pending: ${palette.pending};
}
`;
}
