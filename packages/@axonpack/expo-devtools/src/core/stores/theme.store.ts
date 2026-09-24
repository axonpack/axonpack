import { createAxonStore } from './axon.store';
import {
  BUILT_IN_THEMES,
  resolveTheme,
  type Palette,
  type StatusBarStyle,
  type Theme,
  type ThemeConfig,
  type ThemeId,
} from '../constants/theme.const';

type ThemeState = {
  /** Replaced, never mutated, when a theme is registered, so a subscriber sees the change. */
  themes: ReadonlyMap<ThemeId, Theme>;
  activeId: ThemeId;
};

const initial: ThemeState = {
  themes: new Map(Object.entries(BUILT_IN_THEMES)),
  activeId: 'light',
};

export const themeStore = createAxonStore(initial, (set, get) => {
  const active = (): Theme => get().themes.get(get().activeId) ?? BUILT_IN_THEMES.light;
  return {
    getPalette: (): Palette => active().palette,
    /** What the status bar should be while this theme is showing — see `ThemeConfig.statusBarStyle`. */
    getStatusBarStyle: (): StatusBarStyle => active().statusBarStyle,
    getActiveId: (): ThemeId => get().activeId,
    getIds: (): ThemeId[] => [...get().themes.keys()],
    setActiveId(next: ThemeId) {
      if (next !== get().activeId && get().themes.has(next)) set({ activeId: next });
    },
    register(configs: Record<ThemeId, ThemeConfig>) {
      const themes = new Map(get().themes);
      for (const [id, config] of Object.entries(configs)) themes.set(id, resolveTheme(config));
      set({ themes });
    },
    setDefaultId(next: ThemeId) {
      if (get().themes.has(next)) set({ activeId: next });
    },
  };
});

export const useThemeStore = themeStore.useStore;
