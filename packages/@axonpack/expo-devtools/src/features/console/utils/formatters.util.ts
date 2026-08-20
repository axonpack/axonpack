export const NATIVE_CONSOLE_SOURCE = 'native';

export function formatConsoleSource(source: string): string {
  return source === NATIVE_CONSOLE_SOURCE ? 'Native' : `WebView::[${source}]`;
}
