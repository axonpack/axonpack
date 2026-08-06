import { patchFetch } from '../services/network/patch-fetch.service';
import { patchXHR } from '../services/network/patch-xhr.service';
import {
  getWebViewConditionsRef,
  getWebViewUserAgent,
  shouldAllowWebViewRequest,
} from '../services/network/webview-conditions.service';
import {
  getWebViewInjectedJavaScriptBeforeContentLoaded,
  handleWebViewNetworkMessage,
} from '../services/network/webview-network-logger.service';
import { networkConditionsStore } from '../stores/network/network-conditions.store';
import { networkLogStore } from '../stores/network/network-log.store';

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

export type DevtoolsNetworkConfig<TWebviewSources extends readonly string[]> = {
  includeFetch?: boolean;
  includeXmlHttpRequest?: boolean;
  webviewSources?: TWebviewSources;
};

export type DevtoolsClientConfig<TWebviewSources extends readonly string[]> = {
  enabled?: boolean;
  network?: DevtoolsNetworkConfig<TWebviewSources>;
};

export function createDevtoolsClient<
  const TWebviewSources extends readonly string[] = readonly string[],
>(config?: DevtoolsClientConfig<TWebviewSources>) {
  const isEnabled = config?.enabled ?? true;
  const {
    includeFetch = true,
    includeXmlHttpRequest = true,
    webviewSources,
  } = config?.network ?? {};

  return {
    init() {
      if (!isEnabled) return;
      networkLogStore.setEnabled(true);
      if (includeFetch) patchFetch();
      if (includeXmlHttpRequest) patchXHR();
    },

    getWebViewInjectedJavaScriptBeforeContentLoaded(source: TWebviewSources[number]) {
      return getWebViewInjectedJavaScriptBeforeContentLoaded(source);
    },

    shouldAllowWebViewRequest,
    handleWebViewMessage(event: WebViewMessageEventLike) {
      return handleWebViewNetworkMessage(event, webviewSources);
    },

    getWebViewRef(source: TWebviewSources[number]) {
      return getWebViewConditionsRef(source);
    },

    getWebViewUserAgent,
    networkLogStore,
    networkConditionsStore,
  };
}
