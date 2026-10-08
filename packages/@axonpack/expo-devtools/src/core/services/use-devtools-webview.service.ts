import { useCallback, useEffect, useState } from 'react';

import {
  getWebViewConsoleInjectedJavaScript,
  handleWebViewConsoleMessage,
} from '../../features/console/services/webview-console-logger.service';
import {
  getWebViewConditionsRef,
  getWebViewUserAgent,
  shouldAllowWebViewRequest,
} from '../../features/network/services/webview-conditions.service';
import {
  closeWebViewPage,
  getWebViewInjectedJavaScriptBeforeContentLoaded,
  handleWebViewNetworkMessage,
} from '../../features/network/services/webview-network-logger.service';
import { useNetworkConditionsStore } from '../../features/network/stores/network-conditions.store';
import { useDevtoolsReadyStore } from '../stores/devtools-ready.store';

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

type InjectableWebView = {
  injectJavaScript: (script: string) => void;
};

/** What a `<WebView>` needs to report to the panel. Spread the lot onto it. */
export type DevtoolsWebViewProps = {
  /**
   * Lets the panel push network conditions — offline, throttling, a user agent — into a page that has
   * already loaded. Replace it with a ref of your own and the page still logs, it just stops obeying
   * a condition changed mid-session.
   */
  ref: (instance: InjectableWebView | null) => void;
  /** Patches `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `console` inside the page. */
  injectedJavaScriptBeforeContentLoaded: string;
  /** The user agent set in the Network tab, so the page identifies itself the way the panel says. */
  userAgent: string | undefined;
  /** Makes the page obey the offline switch the way the app's own requests do. */
  onShouldStartLoadWithRequest: () => boolean;
  /**
   * Receives what the page reports. Returns `true` when the message was one of ours, so an app that
   * uses `postMessage` for its own purposes can pass the rest on:
   *
   * ```tsx
   * onMessage={(event) => {
   *   if (devtoolsWebView.onMessage(event)) return;
   *   handleMyOwnMessage(event);
   * }}
   * ```
   */
  onMessage: (event: WebViewMessageEventLike) => boolean;
};

/**
 * Makes one `<WebView>`'s requests, sockets, streams and console output visible to the panel. A page
 * runs in its own JS engine, so it has to be instrumented from the inside, and this is the wiring
 * that does it:
 *
 * ```tsx
 * const devtoolsWebView = useDevtoolsWebView('checkout');
 *
 * return <WebView {...devtoolsWebView} source={{ uri }} />;
 * ```
 *
 * `source` is the label the panel files that page's rows under. Name each WebView when the app has
 * more than one; a single WebView can take the default.
 *
 * Everything it returns is inert until the devtools are running, so the mount is safe to leave
 * unguarded in a release build: the injected script is empty, and with no `onMessage` behind it
 * `react-native-webview` does not install the page bridge at all.
 */
export function useDevtoolsWebView(source: string = 'webview'): DevtoolsWebViewProps {
  /**
   * The scripts below are built from what is recording *now*, and a WebView already on screen when
   * the client starts would otherwise keep the empty one it was handed.
   */
  useDevtoolsReadyStore((state) => state.ready);
  const userAgent = useNetworkConditionsStore(getWebViewUserAgent);
  // One per mounted WebView, not per name: two WebViews may share a name, and one changing page or
  // unmounting must not close the other's rows.
  const [webview] = useState<{ closeTimer?: ReturnType<typeof setTimeout> }>(() => ({}));
  useEffect(() => {
    // Fast Refresh and Strict Mode run the cleanup and then this again on a WebView that is still
    // showing its page. Only a cleanup with no re-run straight after it means the WebView is gone.
    clearTimeout(webview.closeTimer);
    return () => {
      webview.closeTimer = setTimeout(() => closeWebViewPage(webview), 0);
    };
  }, [webview]);
  const onMessage = useCallback(
    (event: WebViewMessageEventLike) =>
      handleWebViewNetworkMessage(event, webview) || handleWebViewConsoleMessage(event),
    [webview]
  );

  return {
    ref: getWebViewConditionsRef(source),
    injectedJavaScriptBeforeContentLoaded: [
      getWebViewInjectedJavaScriptBeforeContentLoaded(source),
      getWebViewConsoleInjectedJavaScript(source),
    ].join('\n'),
    userAgent,
    onShouldStartLoadWithRequest: shouldAllowWebViewRequest,
    onMessage,
  };
}
