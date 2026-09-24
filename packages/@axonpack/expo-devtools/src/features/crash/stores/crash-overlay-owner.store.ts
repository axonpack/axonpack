import { createAxonStore } from '../../../core/stores/axon.store';

/**
 * Which mounted `CrashReportOverlay` owns the report sheet.
 *
 * `DevtoolsOverlay` mounts one of these itself and a production build mounts one directly, so an app
 * doing both would otherwise stack two identical modals. Mounting order decides it: the first to
 * claim owns the sheet and the rest render nothing.
 *
 * A store rather than a counter and a `useState` inside the component, because the claim can only
 * happen on mount and the decision has to reach a render — writing it with `setState` in an effect
 * is the cascading-render pattern React now lints against. Subscribing to it instead is the shape
 * the rule points at: the effect syncs with an external system, and the re-render comes from the
 * subscription.
 *
 * A list rather than a single slot so ownership *passes on*. With a plain counter an instance that
 * lost the claim stayed a loser for life, and unmounting the winner — which is what
 * `DevtoolsOverlay` does the moment the start lands and it swaps branches — left nobody drawing the
 * sheet at all.
 */
export const crashOverlayOwnerStore = createAxonStore({ mounted: [] as object[] }, (set, get) => ({
  getOwner: (): object | null => get().mounted[0] ?? null,
  claim(token: object) {
    if (!get().mounted.includes(token)) set({ mounted: [...get().mounted, token] });
  },
  release(token: object) {
    if (get().mounted.includes(token)) {
      set({ mounted: get().mounted.filter((entry) => entry !== token) });
    }
  },
  /** Test-only; ownership is otherwise driven entirely by mount and unmount. */
  reset: () => set({ mounted: [] }),
}));

export const useCrashOverlayOwnerStore = crashOverlayOwnerStore.useStore;
