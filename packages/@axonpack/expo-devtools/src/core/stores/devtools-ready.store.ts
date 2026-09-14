import { EventEmitter } from 'expo';

type DevtoolsReadyEvents = {
  change: () => void;
};

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
