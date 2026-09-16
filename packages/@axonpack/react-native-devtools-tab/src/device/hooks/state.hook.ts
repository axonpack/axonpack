import { useSyncExternalStore } from "react";

/**
 * A value the app and its tabs share.
 *
 * A tab's component runs in the app, so there is nothing to send: this is one object that both sides
 * read and write. `use()` is a hook, so it works in a tab and in the app's own screens alike, and
 * either one setting it redraws the other.
 *
 * It exists because the alternative is telling the tab to redraw by hand, and nothing keeps that
 * honest: miss one call and the tab quietly shows the wrong thing.
 */

export type TabState<TValue> = {
  /** Reads it now, outside React. */
  get: () => TValue;
  /** Sets it, from either side. Every component reading it redraws. */
  set: (next: TValue | ((current: TValue) => TValue)) => void;
  /** Reads it in a component, and redraws that component whenever it changes. */
  use: () => TValue;
  /** For everything that is not a component. Returns its own unsubscribe. */
  subscribe: (listener: () => void) => () => void;
};

export function createState<TValue>(initial: TValue): TabState<TValue> {
  let value = initial;
  const listeners = new Set<() => void>();

  const get = (): TValue => value;

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    get,
    subscribe,

    set(next) {
      const resolved =
        typeof next === "function"
          ? (next as (current: TValue) => TValue)(value)
          : next;

      // Bailing on an unchanged value is what lets `set` be called from a loop or an interval
      // without redrawing every tab watching it.
      if (Object.is(resolved, value)) return;

      value = resolved;
      for (const listener of listeners) listener();
    },

    use: () => useSyncExternalStore(subscribe, get),
  };
}
