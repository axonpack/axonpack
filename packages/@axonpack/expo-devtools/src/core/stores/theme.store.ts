import { EventEmitter } from 'expo';

import {
  BUILT_IN_THEMES,
  resolveTheme,
  type Palette,
  type StatusBarStyle,
  type Theme,
  type ThemeConfig,
  type ThemeId,
} from '../constants/theme.const';

type ThemeEvents = {
  change: () => void;
};

const emitter = new EventEmitter<ThemeEvents>();

const themes = new Map<ThemeId, Theme>(Object.entries(BUILT_IN_THEMES));

let activeId: ThemeId = 'light';

function notify() {
  emitter.emit('change');
}

function active(): Theme {
  return themes.get(activeId) ?? BUILT_IN_THEMES.light;
}

export const themeStore = {
  getPalette(): Palette {
    return active().palette;
  },
  /** What the status bar should be while this theme is showing — see `ThemeConfig.statusBarStyle`. */
  getStatusBarStyle(): StatusBarStyle {
    return active().statusBarStyle;
  },
  getActiveId(): ThemeId {
    return activeId;
  },
  getIds(): ThemeId[] {
    return [...themes.keys()];
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  setActiveId(next: ThemeId) {
    if (next === activeId || !themes.has(next)) return;
    activeId = next;
    notify();
  },
  register(configs: Record<ThemeId, ThemeConfig>) {
    for (const [id, config] of Object.entries(configs)) {
      themes.set(id, resolveTheme(config));
    }
    notify();
  },
  setDefaultId(next: ThemeId) {
    if (!themes.has(next)) return;
    activeId = next;
    notify();
  },
};
