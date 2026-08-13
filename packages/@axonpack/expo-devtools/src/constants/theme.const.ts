export type Palette = typeof LIGHT_PALETTE;

/** Chrome DevTools' light Network tab */
export const LIGHT_PALETTE = {
  background: '#ffffff',
  toolbarBackground: '#f3f3f3',
  toolbarOverlay: '#0000000D',
  border: '#d0d0d0',
  sectionTint: '#eaf1fc',
  textPrimary: '#202124',
  textSecondary: '#5f6368',
  accent: '#1a73e8',
  pending: '#f9ab00',
  success: '#188038',
  error: '#d93025',
  warning: '#f9ab00',
  errorSurface: '#fce8e6',
  warningSurface: '#fef7e0',
  keyAccent: '#d97706',
  jsonKey: '#881391',
  jsonString: '#c41a16',
  jsonNumber: '#1c00cf',
  codeKeyword: '#0000ff',
  codeComment: '#008000',
  codeTag: '#800000',
};

/** Chrome DevTools' dark theme */
export const DARK_PALETTE: Palette = {
  background: '#202124',
  toolbarBackground: '#292a2d',
  toolbarOverlay: '#ffffff14',
  border: '#3c4043',
  sectionTint: '#28323f',
  textPrimary: '#e8eaed',
  textSecondary: '#9aa0a6',
  accent: '#8ab4f8',
  pending: '#fdd663',
  success: '#81c995',
  error: '#f28b82',
  warning: '#fdd663',
  errorSurface: '#3b2523',
  warningSurface: '#3a3222',
  keyAccent: '#fbbc04',
  jsonKey: '#9cdcfe',
  jsonString: '#ce9178',
  jsonNumber: '#b5cea8',
  codeKeyword: '#569cd6',
  codeComment: '#6a9955',
  codeTag: '#d16969',
};

export type ThemeId = string;

export type BuiltInThemeId =
  'light' | 'dark' | 'dracula' | 'nord' | 'monokai' | 'one-dark' | 'solarized-light';

export type ThemeConfig = {
  base?: BuiltInThemeId;
  colors?: Partial<Palette>;
};

/** https://draculatheme.com */
export const DRACULA_PALETTE: Palette = {
  background: '#282a36',
  toolbarBackground: '#21222c',
  toolbarOverlay: '#ffffff14',
  border: '#44475a',
  sectionTint: '#343746',
  textPrimary: '#f8f8f2',
  textSecondary: '#a4accf',
  accent: '#bd93f9',
  pending: '#f1fa8c',
  success: '#50fa7b',
  error: '#ff5555',
  warning: '#ffb86c',
  errorSurface: '#40222b',
  warningSurface: '#3d3527',
  keyAccent: '#ffb86c',
  jsonKey: '#8be9fd',
  jsonString: '#f1fa8c',
  jsonNumber: '#bd93f9',
  codeKeyword: '#ff79c6',
  codeComment: '#6272a4',
  codeTag: '#ff5555',
};

/** https://www.nordtheme.com */
export const NORD_PALETTE: Palette = {
  background: '#2e3440',
  toolbarBackground: '#3b4252',
  toolbarOverlay: '#ffffff14',
  border: '#434c5e',
  sectionTint: '#3b4252',
  textPrimary: '#eceff4',
  textSecondary: '#9aa5ba',
  accent: '#88c0d0',
  pending: '#ebcb8b',
  success: '#a3be8c',
  error: '#bf616a',
  warning: '#d08770',
  errorSurface: '#3b2d33',
  warningSurface: '#3a342c',
  keyAccent: '#d08770',
  jsonKey: '#8fbcbb',
  jsonString: '#a3be8c',
  jsonNumber: '#b48ead',
  codeKeyword: '#81a1c1',
  codeComment: '#616e88',
  codeTag: '#5e81ac',
};

/** Monokai, as shipped with TextMate and Sublime Text */
export const MONOKAI_PALETTE: Palette = {
  background: '#272822',
  toolbarBackground: '#1e1f1c',
  toolbarOverlay: '#ffffff14',
  border: '#3e3d32',
  sectionTint: '#34352c',
  textPrimary: '#f8f8f2',
  textSecondary: '#a8a48f',
  accent: '#66d9ef',
  pending: '#e6db74',
  success: '#a6e22e',
  error: '#f92672',
  warning: '#fd971f',
  errorSurface: '#3b232c',
  warningSurface: '#3a3122',
  keyAccent: '#fd971f',
  jsonKey: '#f92672',
  jsonString: '#e6db74',
  jsonNumber: '#ae81ff',
  codeKeyword: '#f92672',
  codeComment: '#75715e',
  codeTag: '#a6e22e',
};

/** One Dark, from Atom */
export const ONE_DARK_PALETTE: Palette = {
  background: '#282c34',
  toolbarBackground: '#21252b',
  toolbarOverlay: '#ffffff14',
  border: '#3e4451',
  sectionTint: '#2c313a',
  textPrimary: '#abb2bf',
  textSecondary: '#7f848e',
  accent: '#61afef',
  pending: '#e5c07b',
  success: '#98c379',
  error: '#e06c75',
  warning: '#d19a66',
  errorSurface: '#3a2a2d',
  warningSurface: '#38312a',
  keyAccent: '#d19a66',
  jsonKey: '#e06c75',
  jsonString: '#98c379',
  jsonNumber: '#d19a66',
  codeKeyword: '#c678dd',
  codeComment: '#5c6370',
  codeTag: '#e06c75',
};

/** https://ethanschoonover.com/solarized */
export const SOLARIZED_LIGHT_PALETTE: Palette = {
  background: '#fdf6e3',
  toolbarBackground: '#eee8d5',
  toolbarOverlay: '#0000000D',
  border: '#ddd6c1',
  sectionTint: '#eee8d5',
  textPrimary: '#657b83',
  textSecondary: '#93a1a1',
  accent: '#268bd2',
  pending: '#b58900',
  success: '#859900',
  error: '#dc322f',
  warning: '#cb4b16',
  errorSurface: '#f6ded9',
  warningSurface: '#f5e9cf',
  keyAccent: '#cb4b16',
  jsonKey: '#268bd2',
  jsonString: '#2aa198',
  jsonNumber: '#d33682',
  codeKeyword: '#859900',
  codeComment: '#93a1a1',
  codeTag: '#268bd2',
};

export const BUILT_IN_PALETTES: Record<BuiltInThemeId, Palette> = {
  light: LIGHT_PALETTE,
  dark: DARK_PALETTE,
  dracula: DRACULA_PALETTE,
  nord: NORD_PALETTE,
  monokai: MONOKAI_PALETTE,
  'one-dark': ONE_DARK_PALETTE,
  'solarized-light': SOLARIZED_LIGHT_PALETTE,
};

export function resolvePalette(config: ThemeConfig): Palette {
  return { ...BUILT_IN_PALETTES[config.base ?? 'light'], ...config.colors };
}
