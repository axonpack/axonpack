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
  /**
   * Master switch. When `false` (e.g. a production build), `init()` becomes a no-op: no
   * fetch/XHR patching, no WebView instrumentation, and `networkLogStore` never records or
   * emits. Defaults to `true` — the flag exists for callers who always call `init()`
   * unconditionally and want a single option to disable capture instead of branching at the
   * call site. Not calling `init()` at all has the same effect, since the store defaults to
   * disabled.
   */
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
    getWebViewInjectedScript(source: TWebviewSources[number]) {
      return getWebViewInjectedScript(source);
    },
    handleWebViewMessage(event: WebViewMessageEventLike) {
      return handleWebViewNetworkMessage(event, webviewSources);
    },
    networkLogStore,
  };
}
