import { configureRepl } from '../services/console/evaluate-expression.service';
import { patchConsole } from '../services/console/patch-console.service';
import {
  getWebViewConsoleInjectedJavaScript,
  handleWebViewConsoleMessage,
} from '../services/console/webview-console-logger.service';
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
  /**
   * Show the `>` prompt in the Console tab. Defaults to `__DEV__` — it compiles and runs whatever
   * is typed, so it stays out of release builds unless you opt in explicitly.
   */
  repl?: boolean;
  /**
   * Extra names an expression at the prompt can use, e.g. `{ store, queryClient }`. Optional:
   * globals and `$modules()`/`$m('path')` (Metro's dev-only module registry) work without it. Use
   * it for short stable names, and for reaching app code at all in a release build, where that
   * registry doesn't exist.
   */
  context?: Record<string, unknown>;
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
  const {
    capture: captureConsole = true,
    repl: enableRepl = __DEV__,
    context: replContext,
  } = config?.console ?? {};

  return {
    init() {
      if (!isEnabled) return;
      networkLogStore.setEnabled(true);
      if (includeFetch) patchFetch();
      if (includeXmlHttpRequest) patchXHR();
      // Enabled for the REPL too, not just capture — otherwise a `capture: false` app would run a
      // command at the prompt and see nothing come back.
      if (captureConsole || enableRepl) consoleLogStore.setEnabled(true);
      if (captureConsole) patchConsole();
      configureRepl(enableRepl, replContext);
    },

    /**
     * Network and console instrumentation for the page, concatenated — a consumer still sets one
     * `injectedJavaScriptBeforeContentLoaded` prop and wires one `onMessage`. Each half returns a
     * no-op when its capture is off, so the combined script is always safe to inject.
     */
    getWebViewInjectedJavaScriptBeforeContentLoaded(source: TWebviewSources[number]) {
      const scripts = [getWebViewInjectedJavaScriptBeforeContentLoaded(source)];
      if (captureConsole) scripts.push(getWebViewConsoleInjectedJavaScript(source));
      return scripts.join('\n');
    },

    shouldAllowWebViewRequest,
    handleWebViewMessage(event: WebViewMessageEventLike) {
      // Each handler recognizes only its own marker and reports whether it took the message, so the
      // console one is never asked about a network payload.
      if (handleWebViewNetworkMessage(event, webviewSources)) return true;
      return captureConsole && handleWebViewConsoleMessage(event, webviewSources);
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
