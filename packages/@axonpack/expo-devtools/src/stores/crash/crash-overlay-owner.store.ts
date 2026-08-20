import { EventEmitter } from 'expo';

type CrashOverlayOwnerEvents = {
  change: () => void;
};

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
 * `DevtoolsOverlay` does the moment `init()` lands and it swaps branches — left nobody drawing the
 * sheet at all.
 */
let mounted: object[] = [];

const emitter = new EventEmitter<CrashOverlayOwnerEvents>();

export const crashOverlayOwnerStore = {
  getOwner(): object | null {
    return mounted[0] ?? null;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  claim(token: object) {
    if (mounted.includes(token)) return;
    mounted = [...mounted, token];
    emitter.emit('change');
  },
  release(token: object) {
    if (!mounted.includes(token)) return;
    mounted = mounted.filter((entry) => entry !== token);
    emitter.emit('change');
  },
  /** Test-only; ownership is otherwise driven entirely by mount and unmount. */
  reset() {
    mounted = [];
    emitter.emit('change');
  },
};
