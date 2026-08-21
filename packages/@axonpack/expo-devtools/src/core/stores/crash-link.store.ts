/**
 * The same `Error` object reaches two places: `captureCrash`, and — because React Native's
 * `ExceptionsManager` deliberately re-emits through `console.error` so that patched consoles see it
 * — the console patch. That shared identity is what lets a console row point at the report for the
 * very same error, with no timestamp or message matching to get wrong.
 *
 * A `WeakMap`, so a link never keeps an error (or the scope its stack captured) alive: both the
 * console log and the crash store are ring buffers, and a strong map here would outlive them.
 *
 * It sits in `core/` because the two features on either end own neither half — crash capture writes
 * it, console capture reads it.
 */
const links = new WeakMap<object, string>();

export const crashLinkStore = {
  link(error: unknown, crashId: string) {
    if (typeof error === 'object' && error !== null) links.set(error, crashId);
  },
  find(value: unknown): string | undefined {
    return typeof value === 'object' && value !== null ? links.get(value) : undefined;
  },
};
