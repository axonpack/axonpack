import { isDarkColor } from '../utils/color-luminance.util';

/**
 * Every colour the panel uses, as `#rrggbb` (or `#rrggbbaa` where a token is deliberately
 * translucent). A custom theme overrides any subset of these through
 * `themes: { name: { base, colors } }` — the rest come from the `base` palette.
 */
export type Palette = {
  // ── Surfaces ────────────────────────────────────────────────────────────────────────────────────
  /** The panel's own surface, behind every tab. */
  background: string;
  /**
   * The panel's chrome: the header and the tab bar, which also paint the area behind the status bar.
   * Not for anything inside a tab — a raised element there takes `surface`.
   */
  toolbarBackground: string;
  /** Translucent wash over a toolbar control that is pressed or active. */
  toolbarOverlay: string;
  /**
   * Foreground *on* the chrome: inactive tab labels and icons, the theme picker, the close button.
   *
   * Its own token because a theme is free to make the header a different lightness from the panel —
   * a dark green header over a light panel, say — and `textSecondary` is picked for the panel.
   * Worked out from `toolbarBackground` when a custom theme leaves it out.
   */
  toolbarText: string;
  /** The active tab's label, icon and underline, on the chrome. */
  toolbarTextActive: string;
  /**
   * Anything raised off the panel background inside a tab: a badge, a card, a meter or waterfall
   * track, a code block, a group header, a disabled button.
   *
   * Kept apart from `toolbarBackground` because a theme is free to make its chrome *darker* than the
   * panel — several of the built-ins do — and a badge filled with that reads as a hole rather than a
   * chip.
   */
  surface: string;
  /** Fill behind a selected row or an expanded section. */
  sectionTint: string;
  /** Every hairline: row separators, input borders, panel edges. */
  border: string;

  // ── Text ────────────────────────────────────────────────────────────────────────────────────────
  /** Body text, keys and values. */
  textPrimary: string;
  /** Labels, timestamps, placeholders — anything supporting. */
  textSecondary: string;
  /** The theme's own colour: the launcher button, active tabs, links and focus. */
  accent: string;
  /** Header names and object keys outside a JSON tree. */
  keyAccent: string;

  // ── Status ──────────────────────────────────────────────────────────────────────────────────────
  /** A request still in flight. */
  pending: string;
  /** A 2xx/3xx request, and anything else that went right. */
  success: string;
  /** A failed request, `console.error`, a crash. */
  error: string;
  /** `console.warn` and a slow-but-fine reading. */
  warning: string;
  /** Fill behind an error row or banner. */
  errorSurface: string;
  /** Fill behind a warning row or banner. */
  warningSurface: string;
  /** Highlight on the part of a row that matched the filter. Translucent on purpose. */
  matchHighlight: string;

  // ── Code & JSON ─────────────────────────────────────────────────────────────────────────────────
  /** JSON tree: property names. */
  jsonKey: string;
  /** JSON tree: string values. */
  jsonString: string;
  /** JSON tree: numbers, booleans and `null`. */
  jsonNumber: string;
  /** Syntax highlighting: keywords. */
  codeKeyword: string;
  /** Syntax highlighting: comments. */
  codeComment: string;
  /** Syntax highlighting: HTML/XML tags. */
  codeTag: string;
};

/** Chrome DevTools' light Network tab */
export const LIGHT_PALETTE: Palette = {
  // Surfaces
  background: '#ffffff',
  toolbarBackground: '#f3f3f3',
  toolbarOverlay: '#0000000D',
  toolbarText: '#5f6368',
  toolbarTextActive: '#1a73e8',
  surface: '#f3f3f3',
  sectionTint: '#eaf1fc',
  border: '#d0d0d0',

  // Text
  textPrimary: '#202124',
  textSecondary: '#5f6368',
  accent: '#1a73e8',
  keyAccent: '#d97706',

  // Status
  pending: '#f9ab00',
  success: '#188038',
  error: '#d93025',
  warning: '#f9ab00',
  errorSurface: '#fce8e6',
  warningSurface: '#fef7e0',
  matchHighlight: '#f9ab0059',

  // Code & JSON
  jsonKey: '#881391',
  jsonString: '#c41a16',
  jsonNumber: '#1c00cf',
  codeKeyword: '#0000ff',
  codeComment: '#008000',
  codeTag: '#800000',
};

/** Chrome DevTools' dark theme */
export const DARK_PALETTE: Palette = {
  // Surfaces
  background: '#202124',
  toolbarBackground: '#292a2d',
  toolbarOverlay: '#ffffff14',
  toolbarText: '#9aa0a6',
  toolbarTextActive: '#8ab4f8',
  surface: '#292a2d',
  sectionTint: '#28323f',
  border: '#3c4043',

  // Text
  textPrimary: '#e8eaed',
  textSecondary: '#9aa0a6',
  accent: '#8ab4f8',
  keyAccent: '#fbbc04',

  // Status
  pending: '#fdd663',
  success: '#81c995',
  error: '#f28b82',
  warning: '#fdd663',
  errorSurface: '#3b2523',
  warningSurface: '#3a3222',
  matchHighlight: '#fdd66340',

  // Code & JSON
  jsonKey: '#9cdcfe',
  jsonString: '#ce9178',
  jsonNumber: '#b5cea8',
  codeKeyword: '#569cd6',
  codeComment: '#6a9955',
  codeTag: '#d16969',
};

/**
 * Any theme's id: a built-in one or a name you registered through `themes`. The loose type behind
 * the theme store — `createDevtoolsClient`'s `defaultTheme` is the checked version of it.
 */
export type ThemeId = string;

/**
 * The palettes that ship with the package: `'light'` (the default) and `'dark'` mirror Chrome
 * DevTools, and the rest are the published palettes of their projects. Any of them can be
 * `defaultTheme`, or the `base` a custom theme patches.
 */
export type BuiltInThemeId =
  'light' | 'dark' | 'dracula' | 'nord' | 'monokai' | 'one-dark' | 'solarized-light';

/** A custom palette, as passed to `createDevtoolsClient({ themes })`. */
/**
 * The status bar's content while the panel is open. `'light'` means light icons, for a dark
 * background — the same sense `expo-status-bar`'s `style` has.
 */
export type StatusBarStyle = 'light' | 'dark';

/** A palette and the status bar style that stays legible over it. */
export type Theme = {
  palette: Palette;
  statusBarStyle: StatusBarStyle;
};

export type ThemeConfig = {
  /** The built-in palette every colour is inherited from. Defaults to `'light'`. */
  base?: BuiltInThemeId;
  /** Colours to override on `base`. Every token left out keeps the base's value. */
  colors?: Partial<Palette>;
  /**
   * Status bar content for this theme — `'light'` for light icons over a dark panel, `'dark'` for
   * dark icons over a light one. Worked out from the theme's toolbar colour when left out.
   *
   * Only used when the app asks for it: `<DevtoolsOverlay statusBar="auto" />`. By default the panel
   * leaves the status bar to the app.
   */
  statusBarStyle?: StatusBarStyle;
};

/** https://draculatheme.com */
export const DRACULA_PALETTE: Palette = {
  // Surfaces
  background: '#282a36',
  toolbarBackground: '#21222c',
  toolbarOverlay: '#ffffff14',
  toolbarText: '#a4accf',
  toolbarTextActive: '#bd93f9',
  surface: '#343746',
  sectionTint: '#343746',
  border: '#44475a',

  // Text
  textPrimary: '#f8f8f2',
  textSecondary: '#a4accf',
  accent: '#bd93f9',
  keyAccent: '#ffb86c',

  // Status
  pending: '#f1fa8c',
  success: '#50fa7b',
  error: '#ff5555',
  warning: '#ffb86c',
  errorSurface: '#40222b',
  warningSurface: '#3d3527',
  matchHighlight: '#f1fa8c40',

  // Code & JSON
  jsonKey: '#8be9fd',
  jsonString: '#f1fa8c',
  jsonNumber: '#bd93f9',
  codeKeyword: '#ff79c6',
  codeComment: '#6272a4',
  codeTag: '#ff5555',
};

/** https://www.nordtheme.com */
export const NORD_PALETTE: Palette = {
  // Surfaces
  background: '#2e3440',
  toolbarBackground: '#3b4252',
  toolbarOverlay: '#ffffff14',
  toolbarText: '#9aa5ba',
  toolbarTextActive: '#88c0d0',
  surface: '#3b4252',
  sectionTint: '#3b4252',
  border: '#434c5e',

  // Text
  textPrimary: '#eceff4',
  textSecondary: '#9aa5ba',
  accent: '#88c0d0',
  keyAccent: '#d08770',

  // Status
  pending: '#ebcb8b',
  success: '#a3be8c',
  error: '#bf616a',
  warning: '#d08770',
  errorSurface: '#3b2d33',
  warningSurface: '#3a342c',
  matchHighlight: '#ebcb8b40',

  // Code & JSON
  jsonKey: '#8fbcbb',
  jsonString: '#a3be8c',
  jsonNumber: '#b48ead',
  codeKeyword: '#81a1c1',
  codeComment: '#616e88',
  codeTag: '#5e81ac',
};

/** Monokai, as shipped with TextMate and Sublime Text */
export const MONOKAI_PALETTE: Palette = {
  // Surfaces
  background: '#272822',
  toolbarBackground: '#1e1f1c',
  toolbarOverlay: '#ffffff14',
  toolbarText: '#a8a48f',
  toolbarTextActive: '#66d9ef',
  surface: '#3e3d32',
  sectionTint: '#34352c',
  border: '#3e3d32',

  // Text
  textPrimary: '#f8f8f2',
  textSecondary: '#a8a48f',
  accent: '#66d9ef',
  keyAccent: '#fd971f',

  // Status
  pending: '#e6db74',
  success: '#a6e22e',
  error: '#f92672',
  warning: '#fd971f',
  errorSurface: '#3b232c',
  warningSurface: '#3a3122',
  matchHighlight: '#e6db7440',

  // Code & JSON
  jsonKey: '#f92672',
  jsonString: '#e6db74',
  jsonNumber: '#ae81ff',
  codeKeyword: '#f92672',
  codeComment: '#75715e',
  codeTag: '#a6e22e',
};

/** One Dark, from Atom */
export const ONE_DARK_PALETTE: Palette = {
  // Surfaces
  background: '#282c34',
  toolbarBackground: '#21252b',
  toolbarOverlay: '#ffffff14',
  toolbarText: '#7f848e',
  toolbarTextActive: '#61afef',
  surface: '#2c313a',
  sectionTint: '#2c313a',
  border: '#3e4451',

  // Text
  textPrimary: '#abb2bf',
  textSecondary: '#7f848e',
  accent: '#61afef',
  keyAccent: '#d19a66',

  // Status
  pending: '#e5c07b',
  success: '#98c379',
  error: '#e06c75',
  warning: '#d19a66',
  errorSurface: '#3a2a2d',
  warningSurface: '#38312a',
  matchHighlight: '#e5c07b40',

  // Code & JSON
  jsonKey: '#e06c75',
  jsonString: '#98c379',
  jsonNumber: '#d19a66',
  codeKeyword: '#c678dd',
  codeComment: '#5c6370',
  codeTag: '#e06c75',
};

/** https://ethanschoonover.com/solarized */
export const SOLARIZED_LIGHT_PALETTE: Palette = {
  // Surfaces
  background: '#fdf6e3',
  toolbarBackground: '#eee8d5',
  toolbarOverlay: '#0000000D',
  toolbarText: '#93a1a1',
  toolbarTextActive: '#268bd2',
  surface: '#eee8d5',
  sectionTint: '#eee8d5',
  border: '#ddd6c1',

  // Text
  textPrimary: '#657b83',
  textSecondary: '#93a1a1',
  accent: '#268bd2',
  keyAccent: '#cb4b16',

  // Status
  pending: '#b58900',
  success: '#859900',
  error: '#dc322f',
  warning: '#cb4b16',
  errorSurface: '#f6ded9',
  warningSurface: '#f5e9cf',
  matchHighlight: '#b5890040',

  // Code & JSON
  jsonKey: '#268bd2',
  jsonString: '#2aa198',
  jsonNumber: '#d33682',
  codeKeyword: '#859900',
  codeComment: '#93a1a1',
  codeTag: '#268bd2',
};

/**
 * Every theme that ships, each declaring its own status bar style: a palette alone cannot say
 * whether it is a dark theme or a light one, and the status bar sits over the panel's header.
 */
export const BUILT_IN_THEMES: Record<BuiltInThemeId, Theme> = {
  light: { palette: LIGHT_PALETTE, statusBarStyle: 'dark' },
  dark: { palette: DARK_PALETTE, statusBarStyle: 'light' },
  dracula: { palette: DRACULA_PALETTE, statusBarStyle: 'light' },
  nord: { palette: NORD_PALETTE, statusBarStyle: 'light' },
  monokai: { palette: MONOKAI_PALETTE, statusBarStyle: 'light' },
  'one-dark': { palette: ONE_DARK_PALETTE, statusBarStyle: 'light' },
  'solarized-light': { palette: SOLARIZED_LIGHT_PALETTE, statusBarStyle: 'dark' },
};

/**
 * A custom theme's `{ base, colors, statusBarStyle }` folded into the palette the panel renders and
 * the status bar style it asks for.
 *
 * An undeclared `statusBarStyle` is read off the resolved toolbar colour rather than inherited from
 * the base, so `{ base: 'light', colors: { toolbarBackground: '#111' } }` still gets legible icons.
 */
export function resolveTheme(config: ThemeConfig): Theme {
  const base = BUILT_IN_THEMES[config.base ?? 'light'];
  const merged = { ...base.palette, ...config.colors };
  const chromeIsDark = isDarkColor(merged.toolbarBackground);

  /**
   * A theme that recolours the header without saying what goes on top of it gets a foreground read
   * off that header rather than the base's, which was picked for the panel. Inheriting there is how
   * a dark header ended up wearing the light theme's dark grey tab labels.
   */
  const chromeForeground: Pick<Palette, 'toolbarText' | 'toolbarTextActive'> =
    chromeIsDark === isDarkColor(merged.background)
      ? { toolbarText: base.palette.toolbarText, toolbarTextActive: base.palette.toolbarTextActive }
      : chromeIsDark
        ? { toolbarText: '#ffffffb3', toolbarTextActive: '#ffffff' }
        : { toolbarText: '#00000099', toolbarTextActive: '#000000' };

  const palette = { ...merged, ...chromeForeground, ...config.colors };
  return {
    palette,
    statusBarStyle: config.statusBarStyle ?? (chromeIsDark ? 'light' : 'dark'),
  };
}
