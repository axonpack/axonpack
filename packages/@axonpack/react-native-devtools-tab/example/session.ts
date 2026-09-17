import { useSyncExternalStore } from "react";

/**
 * One value the app's screen and the Session tab both read and both write.
 *
 * Plain React, no library help: a tab is a component rendered in the app, so it reaches the app's
 * own state the same way any other component does.
 */
let value = { user: "nobody", requests: 0 };
const listeners = new Set<() => void>();

export const session = {
  get: () => value,

  set(next: typeof value | ((current: typeof value) => typeof value)) {
    value = typeof next === "function" ? next(value) : next;
    for (const listener of listeners) listener();
  },

  use() {
    return useSyncExternalStore(
      (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      () => value,
    );
  },
};

export function countRequest(): void {
  session.set((current) => ({ ...current, requests: current.requests + 1 }));
}
