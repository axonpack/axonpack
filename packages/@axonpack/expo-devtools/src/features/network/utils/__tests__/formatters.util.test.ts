import { NETWORK_SOURCES } from '../../constants/sources.const';
import { formatSource } from '../formatters.util';

describe('formatSource', () => {
  // The bug this covers: only 'fetch' and 'xhr' were exempt, so React Native's own sockets were
  // labelled WebView::[websocket] — traffic from inside a WebView, which this package cannot yet see.
  it.each(Object.values(NETWORK_SOURCES))('shows %s as itself', (source) => {
    expect(formatSource(source)).toBe(source);
  });

  it('says which WebView a declared source came from', () => {
    expect(formatSource('checkout-page')).toBe('WebView::[checkout-page]');
  });
});
