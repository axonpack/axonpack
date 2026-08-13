import { EventEmitter } from 'expo';

import {
  BUILT_IN_PALETTES,
  resolvePalette,
  type Palette,
  type ThemeConfig,
  type ThemeId,
} from '../constants/theme.const';

type ThemeEvents = {
  change: () => void;
};

const emitter = new EventEmitter<ThemeEvents>();

const palettes = new Map<ThemeId, Palette>(Object.entries(BUILT_IN_PALETTES));

let activeId: ThemeId = 'light';

function notify() {
  emitter.emit('change');
}

export const themeStore = {
  getPalette(): Palette {
    return palettes.get(activeId) ?? BUILT_IN_PALETTES.light;
  },
  getActiveId(): ThemeId {
    return activeId;
  },
  getIds(): ThemeId[] {
    return [...palettes.keys()];
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  setActiveId(next: ThemeId) {
    if (next === activeId || !palettes.has(next)) return;
    activeId = next;
    notify();
  },
  register(themes: Record<ThemeId, ThemeConfig>) {
    for (const [id, config] of Object.entries(themes)) {
      palettes.set(id, resolvePalette(config));
    }
    notify();
  },
  setDefaultId(next: ThemeId) {
    if (!palettes.has(next)) return;
    activeId = next;
    notify();
  },
};
