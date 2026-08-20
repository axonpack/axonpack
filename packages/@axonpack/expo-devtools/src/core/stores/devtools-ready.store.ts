import { EventEmitter } from 'expo';

type DevtoolsReadyEvents = {
  change: () => void;
};

/**
 * Whether `init()` has actually brought the panel up.
 *
 * `DevtoolsOverlay` reads this and draws nothing until it flips, which makes the launcher button
 * self-guarding: an unguarded mount in a release build shows no button rather than one that opens
 * empty lists. It is set at the *end* of `init()`, past the `enabled` gate, so `enabled: false` —
 * the crash-capture-only configuration — leaves it false and the panel unreachable.
 *
 * A store rather than a plain boolean because the order isn't guaranteed: `init()` normally runs at
 * module scope, before anything renders, but an app that calls it from an effect mounts the overlay
 * first, and that overlay has to re-render when it flips.
 */
let ready = false;

const emitter = new EventEmitter<DevtoolsReadyEvents>();

export const devtoolsReadyStore = {
  isReady(): boolean {
    return ready;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  markReady() {
    if (ready) return;
    ready = true;
    emitter.emit('change');
  },
  /** Test-only; nothing turns the panel back off for the life of the process. */
  reset() {
    ready = false;
    emitter.emit('change');
  },
};
