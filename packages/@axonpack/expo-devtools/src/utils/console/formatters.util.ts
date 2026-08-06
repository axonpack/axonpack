/** Tag for anything logged by the app's own JS context, as opposed to a page inside a WebView. */
export const NATIVE_CONSOLE_SOURCE = 'native';

/**
 * Console sources are either the app itself or a WebView's declared name — unlike the network log's
 * `formatSource`, which also has 'fetch'/'xhr' transports to distinguish.
 */
export function formatConsoleSource(source: string): string {
  return source === NATIVE_CONSOLE_SOURCE ? 'Native' : `WebView::[${source}]`;
}
