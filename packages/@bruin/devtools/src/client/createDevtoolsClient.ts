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
    init() {
      if (includeFetch) patchFetch();
      if (includeXmlHttpRequest) patchXHR();
    },
    getWebViewInjectedScript(source: TWebviewSources[number]) {
      return getWebViewInjectedScript(source);
    },
    handleWebViewMessage(event: WebViewMessageEventLike) {
      return handleWebViewNetworkMessage(event, webviewSources);
    },
    networkLogStore,
  };
}
