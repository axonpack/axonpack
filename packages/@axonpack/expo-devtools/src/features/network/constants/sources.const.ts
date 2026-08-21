/**
 * Every source this package mints itself, in one place because two things read the list: the patches
 * that stamp a row, and the formatter that decides how a source is shown. A row's `source` is
 * otherwise a WebView name the consumer declared, and the formatter tells the two apart by membership
 * here — so a source added to a patch and not to this object gets displayed as a WebView.
 */
export const NETWORK_SOURCES = {
  fetch: 'fetch',
  /** Expo's own fetch, imported directly rather than read off the global. */
  expoFetch: 'expo/fetch',
  xhr: 'xhr',
  /** React Native's WebSocket, which is the only socket this package can see. */
  webSocket: 'websocket',
  /** A JSI client that answers no patch, and reports its own traffic instead. */
  nitro: 'nitro-fetch',
} as const;

export type NetworkSource = (typeof NETWORK_SOURCES)[keyof typeof NETWORK_SOURCES];

const NATIVE_SOURCES: readonly string[] = Object.values(NETWORK_SOURCES);

export function isNativeSource(source: string): boolean {
  return NATIVE_SOURCES.includes(source);
}
