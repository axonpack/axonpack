import { patchConsole } from '../services/console/patch-console.service';
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
import { consoleLogStore } from '../stores/console/console-log.store';
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

export type DevtoolsConsoleConfig = {
  capture?: boolean;
};

export type DevtoolsClientConfig<TWebviewSources extends readonly string[]> = {
  enabled?: boolean;
  network?: DevtoolsNetworkConfig<TWebviewSources>;
  console?: DevtoolsConsoleConfig;
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
  const { capture: captureConsole = true } = config?.console ?? {};

  return {
    init() {
      if (!isEnabled) return;
      networkLogStore.setEnabled(true);
      if (includeFetch) patchFetch();
      if (includeXmlHttpRequest) patchXHR();
      if (captureConsole) {
        consoleLogStore.setEnabled(true);
        patchConsole();
      }
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
    consoleLogStore,
  };
}
