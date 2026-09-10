import { useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';

import type { Palette, StatusBarStyle } from '../constants/theme.const';
import { themeStore } from '../stores/theme.store';

export function useThemeColors(): Palette {
  return useSyncExternalStore(themeStore.subscribe, themeStore.getPalette);
}

/** The active theme's own status bar style, re-read when the theme changes. */
export function useStatusBarStyle(): StatusBarStyle {
  return useSyncExternalStore(themeStore.subscribe, themeStore.getStatusBarStyle);
}

export function makeThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (COLORS: Palette) => T
): () => T {
  const cache = new WeakMap<Palette, T>();

  return function useThemedStyles(): T {
    const palette = useThemeColors();
    const cached = cache.get(palette);
    if (cached) return cached;

    const created = StyleSheet.create(factory(palette));
    cache.set(palette, created);
    return created;
  };
}
