import { createAxonStore } from '../../../core/stores/axon.store';
import type { LimiterTarget } from '../constants/limiter.const';

export type LimiterState = {
  target: LimiterTarget;
  durationMs: number;
  /** What was typed into Custom, digits only. Empty while a preset is picked. */
  customText: string;
};

/**
 * A store rather than state in the view, because the Debug tab has two surfaces: the panel in the
 * app and the one in React Native DevTools. The thread and duration picked on either show on both.
 * Arming a crash stays each surface's own, since it is a latch on one button, not a setting.
 */
const initial: LimiterState = { target: 'js', durationMs: 250, customText: '' };

export const limiterStore = createAxonStore(initial, (set) => ({
  setTarget: (target: LimiterTarget) => set({ target }),
  choosePreset: (durationMs: number) => set({ durationMs, customText: '' }),
  /** Keeps the digits, and takes them as the duration once they make a number above zero. */
  setCustomText: (text: string) => {
    const customText = text.replace(/[^0-9]/g, '');
    const parsed = Number(customText);
    set(customText.length > 0 && parsed > 0 ? { customText, durationMs: parsed } : { customText });
  },
}));

export const useLimiterStore = limiterStore.useStore;
