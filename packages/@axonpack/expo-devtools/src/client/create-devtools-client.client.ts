import type { ThemeConfig, ThemeId } from '../constants/theme.const';
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
import {
  clearRecordedMarks,
  clearRecordedMeasures,
  recordMark,
  recordMeasure,
  type MarkOptions,
  type MeasureOptions,
} from '../services/performance/user-timing.service';
import { consoleLogStore } from '../stores/console/console-log.store';
import { networkConditionsStore } from '../stores/network/network-conditions.store';
import { networkLogStore } from '../stores/network/network-log.store';
import { performanceStore } from '../stores/performance/performance.store';
import { themeStore } from '../stores/theme.store';

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

export type DevtoolsNetworkConfig = {
  includeFetch?: boolean;
  includeXmlHttpRequest?: boolean;
  disabledByDefault?: boolean;
};

export type DevtoolsConsoleConfig = {
  capture?: boolean;
  repl?: boolean;
  context?: Record<string, unknown>;
  disabledByDefault?: boolean;
};

export type DevtoolsPerformanceConfig = {
  sampleIntervalMs?: number;
  longTaskThresholdMs?: number;
  interactionThresholdMs?: number;
  historySize?: number;
  disabledByDefault?: boolean;
};

export type DevtoolsClientConfig<TWebviewSources extends readonly string[]> = {
  defaultTheme?: ThemeId;
  themes?: Record<ThemeId, ThemeConfig>;
  webviewSources?: TWebviewSources;
  network?: DevtoolsNetworkConfig;
  console?: DevtoolsConsoleConfig;
  performance?: DevtoolsPerformanceConfig;
};

export function createDevtoolsClient<
  const TWebviewSources extends readonly string[] = readonly string[],
>(config?: DevtoolsClientConfig<TWebviewSources>) {
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
      if (config?.themes) themeStore.register(config.themes);
      if (config?.defaultTheme) themeStore.setDefaultId(config.defaultTheme);
      networkLogStore.setEnabled(true);
      if (networkStartsPaused) networkLogStore.setPaused(true);
      if (includeFetch) patchFetch();
      if (includeXmlHttpRequest) patchXHR();
      if (captureConsole || enableRepl) consoleLogStore.setEnabled(true);
      if (consoleStartsPaused) consoleLogStore.setPaused(true);
      if (captureConsole) patchConsole();
      configureRepl(enableRepl, replContext);

      performanceStore.setHistorySize(historySize);
      performanceStore.setEnabled(true);

      if (performanceStartsPaused) performanceStore.setPaused(true);

      startPerformanceCollectors({
        sampleIntervalMs,
        longTaskThresholdMs,
        interactionThresholdMs,
      });
    },
    getWebViewInjectedJavaScriptBeforeContentLoaded(source: TWebviewSources[number]) {
      const scripts = [getWebViewInjectedJavaScriptBeforeContentLoaded(source)];
      if (captureConsole) scripts.push(getWebViewConsoleInjectedJavaScript(source));
      return scripts.join('\n');
    },
    mark(name: string, options?: MarkOptions) {
      recordMark(name, options);
    },
    measure(name: string, startOrOptions?: string | MeasureOptions, endMark?: string) {
      recordMeasure(name, startOrOptions, endMark);
    },
    clearMarks(name?: string) {
      clearRecordedMarks(name);
    },
    clearMeasures(name?: string) {
      clearRecordedMeasures(name);
    },
    shouldAllowWebViewRequest,
    handleWebViewMessage(event: WebViewMessageEventLike) {
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
