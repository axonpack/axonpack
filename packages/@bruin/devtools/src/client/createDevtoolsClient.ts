import { networkLogStore } from '../utils/network/networkLogStore';
import { patchFetch } from '../utils/network/patchFetch';
import { patchXHR } from '../utils/network/patchXHR';
import {
  getWebViewInjectedScript,
  handleWebViewNetworkMessage,
} from '../utils/network/webviewNetworkLogger';

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

export type DevtoolsNetworkConfig<TWebviewSources extends readonly string[]> = {
  includeFetch?: boolean;
  includeXmlHttpRequest?: boolean;
  /** Named allowlist of WebView sources — logging a WebView requires wiring it up with one of these names. */
  webviewSources?: TWebviewSources;
};

export type DevtoolsClientConfig<TWebviewSources extends readonly string[]> = {
  network?: DevtoolsNetworkConfig<TWebviewSources>;
};

export function createDevtoolsClient<
  const TWebviewSources extends readonly string[] = readonly string[],
>(config?: DevtoolsClientConfig<TWebviewSources>) {
  const {
    includeFetch = true,
    includeXmlHttpRequest = true,
    webviewSources,
  } = config?.network ?? {};

  return {
    /** Installs the fetch/XHR patches according to the network config. Call once at app startup. */
    init() {
      if (includeFetch) patchFetch();
      if (includeXmlHttpRequest) patchXHR();
    },
    /** Pass to a WebView's `injectedJavaScript` prop. `source` is limited to `network.webviewSources`. */
    getWebViewInjectedScript(source: TWebviewSources[number]) {
      return getWebViewInjectedScript(source);
    },
    /** Pass to (or call from within) a WebView's `onMessage` prop. */
    handleWebViewMessage(event: WebViewMessageEventLike) {
      return handleWebViewNetworkMessage(event, webviewSources);
    },
    networkLogStore,
  };
}
