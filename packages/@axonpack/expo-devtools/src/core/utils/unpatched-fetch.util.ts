/**
 * The package patches `globalThis.fetch` to log traffic, so a request the panel makes on its own
 * behalf — symbolication — would show up in the Network tab as if the app had made it, and would be
 * throttled and user-agent rewritten with everything else. The pristine function is kept here at
 * patch time so devtools' own traffic can bypass all of that.
 */
let unpatched: typeof globalThis.fetch | undefined;

export function rememberUnpatchedFetch(original: typeof globalThis.fetch) {
  unpatched ??= original;
}

/** Falls back to the global when the patch was never installed — then it is already pristine. */
export function getUnpatchedFetch(): typeof globalThis.fetch {
  return unpatched ?? globalThis.fetch;
}
