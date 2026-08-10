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
import { startPerformanceCollectors } from '../services/performance/performance-collectors.service';
import { appIdentityStore } from '../stores/app-identity.store';
import { consoleLogStore } from '../stores/console/console-log.store';
import { networkConditionsStore } from '../stores/network/network-conditions.store';
import { networkLogStore } from '../stores/network/network-log.store';
import { performanceStore } from '../stores/performance/performance.store';

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

export type DevtoolsPerformanceConfig = {
  /**
   * How often the JS heap is read. Each read crosses JSI into the engine, so this is deliberately
   * coarse — sampling at animation rates would make the profiler the slowdown it is measuring.
   */
  sampleIntervalMs?: number;
  /** Only tasks blocking the JS thread for at least this long are reported. */
  longTaskThresholdMs?: number;
  /**
   * Only interactions taking at least this long, event to next paint, are reported. 100ms is roughly
   * where a tap stops feeling immediate, so a lower value mostly records healthy interactions.
   */
  interactionThresholdMs?: number;
  historySize?: number;
  disabledByDefault?: boolean;
};

export type DevtoolsClientConfig<TWebviewSources extends readonly string[]> = {
  name?: string;
  /** Any `Image` source, e.g. `require('./assets/icon.png')`. */
  icon?: ImageSourcePropType;
  webviewSources?: TWebviewSources;
  network?: DevtoolsNetworkConfig;
  console?: DevtoolsConsoleConfig;
  performance?: DevtoolsPerformanceConfig;
};

export function createDevtoolsClient<
  const TWebviewSources extends readonly string[] = readonly string[],
>(config?: DevtoolsClientConfig<TWebviewSources>) {
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
  const {
    sampleIntervalMs = 1000,
    longTaskThresholdMs = 50,
    interactionThresholdMs = 100,
    historySize = 120,
    disabledByDefault: performanceStartsPaused = true,
  } = config?.performance ?? {};

  return {
    init() {
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

      performanceStore.setHistorySize(historySize);
      performanceStore.setEnabled(true);
      // Set before the collectors start, so a `disabledByDefault` client attaches nothing at all
      // rather than attaching and immediately detaching.
      if (performanceStartsPaused) performanceStore.setPaused(true);
      // Collectors attach and detach with the record button — see the service for why. They outlive
      // the panel, so history survives it closing. The FPS monitor is the exception and starts from
      // the view; see fps-monitor.service.ts.
      startPerformanceCollectors({
        sampleIntervalMs,
        longTaskThresholdMs,
        interactionThresholdMs,
      });
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
