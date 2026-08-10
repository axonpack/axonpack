import type { ImageSourcePropType } from 'react-native';

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
import { appIdentityStore } from '../stores/app-identity.store';
import { consoleLogStore } from '../stores/console/console-log.store';
import { networkConditionsStore } from '../stores/network/network-conditions.store';
import { networkLogStore } from '../stores/network/network-log.store';

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

export type DevtoolsNetworkConfig = {
  includeFetch?: boolean;
  includeXmlHttpRequest?: boolean;
  /**
   * Open the Network tab not recording. Instrumentation is still installed, so the record button in
   * the tab's toolbar starts capture whenever you want it — nothing before that point is kept.
   */
  disabledByDefault?: boolean;
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
  /** Open the Console tab not recording, the same as `network.disabledByDefault`. */
  disabledByDefault?: boolean;
};

export type DevtoolsClientConfig<TWebviewSources extends readonly string[]> = {
  enabled?: boolean;
  /**
   * Your app's name and icon, shown in the panel header in place of this package's own. Both have to
   * be passed explicitly: the installed launcher icon isn't reachable from JS, and `expoConfig.icon`
   * is a build-time path rather than something `Image` can load in a standalone build.
   */
  name?: string;
  /** Any `Image` source, e.g. `require('./assets/icon.png')`. */
  icon?: ImageSourcePropType;
  /**
   * Names of the in-app browser views allowed to report in. Top-level rather than under `network`
   * because both the network and console tabs capture from a declared WebView, and the allowlist
   * has to be the same one for each.
   */
  webviewSources?: TWebviewSources;
  network?: DevtoolsNetworkConfig;
  console?: DevtoolsConsoleConfig;
};

export function createDevtoolsClient<
  const TWebviewSources extends readonly string[] = readonly string[],
>(config?: DevtoolsClientConfig<TWebviewSources>) {
  const isEnabled = config?.enabled ?? true;
  const appName = config?.name;
  const appIcon = config?.icon;
  const webviewSources = config?.webviewSources;
  const {
    includeFetch = true,
    includeXmlHttpRequest = true,
    disabledByDefault: networkStartsPaused = false,
  } = config?.network ?? {};
  const {
    capture: captureConsole = true,
    repl: enableRepl = __DEV__,
    context: replContext,
    disabledByDefault: consoleStartsPaused = false,
  } = config?.console ?? {};

  return {
    init() {
      if (!isEnabled) return;
      if (appName || appIcon) appIdentityStore.set({ name: appName, icon: appIcon });
      networkLogStore.setEnabled(true);
      if (networkStartsPaused) networkLogStore.setPaused(true);
      if (includeFetch) patchFetch();
      if (includeXmlHttpRequest) patchXHR();
      // Enabled for the REPL too, not just capture — otherwise a `capture: false` app would run a
      // command at the prompt and see nothing come back.
      if (captureConsole || enableRepl) consoleLogStore.setEnabled(true);
      if (consoleStartsPaused) consoleLogStore.setPaused(true);
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
