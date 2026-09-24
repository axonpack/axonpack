import { createAxonStore } from './axon.store';

/**
 * Whether a client has actually brought the panel up.
 *
 * `DevtoolsOverlay` reads this and draws nothing until it flips, which makes the launcher button
 * self-guarding: an unguarded mount in a release build shows no button rather than one that opens
 * empty lists. It is set at the *end* of the start, past the `enabled` gate, so `enabled: false`
 * leaves it false and the panel unreachable.
 *
 * A store rather than a plain boolean because the overlay can render before the flip: the provider
 * starts its client as it renders, so the first paint of a deeply nested overlay is in step, but a
 * provider mounted later is not, and that overlay has to re-render when it flips.
 */
export const devtoolsReadyStore = createAxonStore({ ready: false }, (set, get) => ({
  isReady: (): boolean => get().ready,
  markReady() {
    if (!get().ready) set({ ready: true });
  },
  /** Test-only; nothing turns the panel back off for the life of the process. */
  reset: () => set({ ready: false }),
}));

export const useDevtoolsReadyStore = devtoolsReadyStore.useStore;
