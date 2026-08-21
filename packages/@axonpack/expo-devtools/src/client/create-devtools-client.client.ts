import type { ThemeConfig, ThemeId } from '../core/constants/theme.const';
import { devtoolsReadyStore } from '../core/stores/devtools-ready.store';
import { themeStore } from '../core/stores/theme.store';
import { configureRepl } from '../features/console/services/evaluate-expression.service';
import { patchConsole } from '../features/console/services/patch-console.service';
import {
  getWebViewConsoleInjectedJavaScript,
  handleWebViewConsoleMessage,
} from '../features/console/services/webview-console-logger.service';
import { consoleLogStore } from '../features/console/stores/console-log.store';
import {
  configureCrashCapture,
  setCrashContext,
} from '../features/crash/services/capture-crash.service';
import { setCrashPopupDetail } from '../features/crash/services/crash-popup.service';
import { disableDefaultLogBox } from '../features/crash/services/disable-logbox.service';
import {
  drainOnce,
  installCrashHandlers,
} from '../features/crash/services/install-crash-handlers.service';
import { crashStore, type CrashRecord } from '../features/crash/stores/crash.store';
import { installNativeTimingReporter } from '../features/network/services/native-timing.service';
import { patchFetch } from '../features/network/services/patch-fetch.service';
import { patchWebSocket } from '../features/network/services/patch-websocket.service';
import { patchXHR } from '../features/network/services/patch-xhr.service';
import {
  getWebViewConditionsRef,
  getWebViewUserAgent,
  shouldAllowWebViewRequest,
} from '../features/network/services/webview-conditions.service';
import {
  getWebViewInjectedJavaScriptBeforeContentLoaded,
  handleWebViewNetworkMessage,
  setWebViewSocketCapture,
} from '../features/network/services/webview-network-logger.service';
import { networkConditionsStore } from '../features/network/stores/network-conditions.store';
import { networkLogStore } from '../features/network/stores/network-log.store';
import { startPerformanceCollectors } from '../features/performance/services/performance-collectors.service';
import {
  clearRecordedMarks,
  clearRecordedMeasures,
  recordMark,
  recordMeasure,
  type MarkOptions,
  type MeasureOptions,
} from '../features/performance/services/user-timing.service';
import { performanceStore } from '../features/performance/stores/performance.store';
import {
  resolveStorageAdapters,
  type StorageAdapterDefinition,
} from '../features/storage/services/define-adapter.service';
import { configureStorageReads } from '../features/storage/services/read-storage.service';
import { storageStore } from '../features/storage/stores/storage.store';

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

export type DevtoolsNetworkConfig = {
  includeFetch?: boolean;
  includeXmlHttpRequest?: boolean;
  /** WebSocket connections and their messages. Defaults to `true`. */
  includeWebSocket?: boolean;
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

export type DevtoolsCrashConfig = {
  /** Capture at all. Defaults to `true`. */
  enabled?: boolean;
  /**
   * Keep capturing crashes even when the devtools are off — which, in this package, means nothing
   * more than an app that never calls `init()`. The usual `if (__DEV__) devtools.init()` in a
   * release build is exactly that case. Defaults to `false`.
   *
   * So this flag installs the crash handlers when the client is **constructed**, making it the one
   * deliberate exception to "nothing in this package runs until `init()`". Setting it is the consent
   * `init()` would otherwise have given, and it buys earlier coverage: handlers installed at import
   * catch what is thrown before `init()` would have run.
   *
   * On its own it captures **native exceptions only** — the crashes that end the app — and reports
   * them in the compact sheet. A later `init()` upgrades it: the JS tiers install too and the full
   * sheet takes over. It brings nothing else with it either way: no panel, no REPL, no console
   * capture, no request bodies.
   */
  enableWhileDevtoolsDisabled?: boolean;
  /**
   * Which tiers to capture once `init()` has run. All default to `true`.
   *
   * Before that — an app relying on `enableWhileDevtoolsDisabled` alone — only `nativeExceptions`
   * runs whatever these say: the JS tiers report errors the app survived, which is a developer's
   * concern, and the sheet is in front of a user there. A fatal JS error still arrives, because
   * React Native turns it into a native exception on the way to killing the process.
   */
  handlers?: {
    /**
     * `ErrorUtils` global handler — fatal and non-fatal JS errors.
     *
     * Installing it also stops a fatal error from ending the app: React Native is what reports one to
     * the native side, and this handler is what withholds it. Turning the tier off hands that back,
     * so the app crashes the way it would without this package.
     */
    jsErrors?: boolean;
    /**
     * Unhandled promise rejections — the tier that adds the most in a development build, since React
     * Native registers its own tracker only under `__DEV__`.
     */
    unhandledRejections?: boolean;
    /** Uncaught Java/Kotlin and Objective-C exceptions, via the native module. */
    nativeExceptions?: boolean;
  };
  /**
   * Which sheet that is. Defaults to `'auto'`: the full developer sheet when the devtools are
   * enabled, the compact one when they are not.
   *
   * - `'full'` — the message, the stack and the device under Summary, a Breadcrumbs tab beside it,
   *   and this package's own branding on the header. A debugging tool.
   * - `'compact'` — a plain notice: what broke, when, and Share / Copy / Dismiss. Nothing on it
   *   names this package, and the full record still travels with Share and Copy.
   *
   * Set it explicitly for an internal build that ships the crash sheet but not the panel and still
   * wants the stack on screen.
   */
  popupDetail?: 'auto' | 'full' | 'compact';
  /**
   * Turn off React Native's own LogBox, so a JS error is reported here and nowhere else. Defaults to
   * `false`.
   *
   * This uninstalls LogBox rather than muting it — muting only hides the toasts, and an uncaught
   * error still opens the full-screen red box. Uninstalling takes the **yellow warning toasts with
   * it**: LogBox is one component and the two cannot be separated. Warnings are still captured by
   * the Console tab.
   *
   * Only does anything in development; LogBox is already an empty stub in a release build.
   */
  disableDefaultLogBox?: boolean;
  /**
   * Attach the recent console and network entries to each record. Defaults to `true` — that
   * trail carries request URLs and whatever the app logged, which is a different privacy
   * proposition from a stack trace.
   */
  breadcrumbs?: boolean;
  maxBreadcrumbs?: number;
  /** Reports kept in memory. Defaults to 25. */
  maxRecords?: number;
  /**
   * Also write non-fatal records to disk. Off by default: the app survived them, so they are already
   * in the panel, and persisting one means reporting it again at the next launch.
   */
  persistNonFatal?: boolean;
  /** Runs before the record reaches the store, the disk or `onCrash`. Return `null` to drop it. */
  redact?: (record: CrashRecord) => CrashRecord | null;
  onCrash?: (record: CrashRecord) => void;
};

export type DevtoolsStorageConfig = {
  /**
   * The stores to inspect, built with `asyncStorageAdapter` / `mmkvAdapter` /
   * `secureStoreAdapter` / `defineStorageAdapter`. Nothing is discovered automatically — this
   * package depends on no storage library, so this list is the whole of what the tab can see.
   */
  adapters?: readonly StorageAdapterDefinition[];
  /** Keys read per store before the tab stops and says how many it skipped. */
  maxKeys?: number;
  /** Blanket read-only default; an individual adapter can still set its own. */
  readOnly?: boolean;
};

export type DevtoolsClientConfig<TWebviewSources extends readonly string[]> = {
  defaultTheme?: ThemeId;
  themes?: Record<ThemeId, ThemeConfig>;
  webviewSources?: TWebviewSources;
  network?: DevtoolsNetworkConfig;
  console?: DevtoolsConsoleConfig;
  performance?: DevtoolsPerformanceConfig;
  storage?: DevtoolsStorageConfig;
  crash?: DevtoolsCrashConfig;
};

export function createDevtoolsClient<
  const TWebviewSources extends readonly string[] = readonly string[],
>(config?: DevtoolsClientConfig<TWebviewSources>) {
  const webviewSources = config?.webviewSources;
  const {
    includeFetch = true,
    includeXmlHttpRequest = true,
    includeWebSocket = true,
    disabledByDefault: networkStartsPaused = false,
  } = config?.network ?? {};
  const {
    capture: captureConsole = true,
    repl: enableRepl = true,
    context: replContext,
    disabledByDefault: consoleStartsPaused = false,
  } = config?.console ?? {};
  const {
    sampleIntervalMs = 1000,
    longTaskThresholdMs = 150,
    interactionThresholdMs = 100,
    historySize = 120,
    disabledByDefault: performanceStartsPaused = true,
  } = config?.performance ?? {};
  const {
    adapters: storageAdapters,
    maxKeys: storageMaxKeys,
    readOnly: storageReadOnly,
  } = config?.storage ?? {};
  const {
    enabled: crashEnabled = true,
    enableWhileDevtoolsDisabled: crashSurvivesDisabled = false,
    handlers: crashHandlers,
    popupDetail: crashPopupDetail = 'auto',
    disableDefaultLogBox: turnOffLogBox = false,
    breadcrumbs: crashBreadcrumbs = true,
    maxRecords: maxCrashRecords = 25,
    persistNonFatal = false,
    redact: redactCrash,
    onCrash,
  } = config?.crash ?? {};

  /**
   * Crash capture is the only part of this package that can run without `init()`, so it is the only
   * thing here with a gate of its own.
   *
   * `panelAvailable` says whether a devtools panel is coming up, which is simply whether this is the
   * `init()` call. The factory-time call cannot know that `init()` is coming, so it takes the
   * cautious side of every choice — native tier only, compact sheet — and `init()` upgrades it.
   */
  function initCrashCapture(panelAvailable: boolean) {
    if (!crashEnabled) return;
    if (!panelAvailable && !crashSurvivesDisabled) return;

    crashStore.setMaxRecords(maxCrashRecords);
    crashStore.setEnabled(true);
    setCrashPopupDetail(
      crashPopupDetail === 'auto' ? (panelAvailable ? 'full' : 'compact') : crashPopupDetail
    );
    configureCrashCapture({
      /**
       * Belt to the handler braces below. The JS handlers are not installed at all before `init()`,
       * but `DevtoolsErrorBoundary` calls `captureCrash` directly — it is a component the app
       * mounts, not a handler we install — so the policy has to live here too.
       */
      jsTiers: panelAvailable,
      breadcrumbs: crashBreadcrumbs,
      persistNonFatal,
      redact: redactCrash,
      onCrash,
    });
    // Without `init()`, only the tier that ends the app is installed — see `handlers`. Each tier
    // installs at most once, so the `init()` call adds the JS ones rather than doubling up.
    installCrashHandlers({
      jsErrors: panelAvailable && (crashHandlers?.jsErrors ?? true),
      unhandledRejections: panelAvailable && (crashHandlers?.unhandledRejections ?? true),
      nativeExceptions: crashHandlers?.nativeExceptions ?? true,
    });

    // The factory-time path never reaches `init()`, so its drain has to happen here — there is no
    // console to wait for in a build with no panel, and a record left on disk would be reported at
    // some arbitrary later launch instead. `init()` drains after the console is recording.
    if (!panelAvailable) drainOnce();

    if (turnOffLogBox) {
      // Installed after the handlers, so an error thrown while they were going in still reaches the
      // red box — this is the window where nothing of ours is listening yet.
      disableDefaultLogBox();
    }
  }

  /**
   * Registering a palette patches nothing and starts nothing — it fills a lookup that only a render
   * reads. Doing it here rather than in `init()` is what lets the crash sheet honour `defaultTheme`
   * in a build where `init()` is never called.
   */
  if (config?.themes) themeStore.register(config.themes);
  if (config?.defaultTheme) themeStore.setDefaultId(config.defaultTheme);

  // The exception to "nothing runs until `init()`", and the flag above is the opt-in for it.
  if (crashSurvivesDisabled) initCrashCapture(false);

  return {
    init() {
      // First among the subsystems, so the handlers are already listening if anything below throws.
      // Safe to re-run when the factory already installed the native tier: this is where the JS
      // tiers get added and the full sheet takes over.
      initCrashCapture(true);

      networkLogStore.setEnabled(true);
      if (networkStartsPaused) networkLogStore.setPaused(true);
      if (includeFetch) patchFetch();
      if (includeXmlHttpRequest) patchXHR();
      if (includeWebSocket) patchWebSocket();
      // The same switch covers a page's own sockets, which the native patch cannot see at all.
      setWebViewSocketCapture(includeWebSocket);
      // Before the app's first request on purpose: on Android the phase listener goes in by replacing
      // React Native's OkHttp client factory, and that client is built once, on first use.
      if (includeFetch || includeXmlHttpRequest) installNativeTimingReporter();
      if (captureConsole || enableRepl) consoleLogStore.setEnabled(true);
      if (consoleStartsPaused) consoleLogStore.setPaused(true);
      if (captureConsole) patchConsole();

      // After the console is recording, not with the handlers: a crash from the last run writes a
      // console row as well as a report now, and draining before this point threw that row away.
      drainOnce();
      configureRepl(enableRepl, replContext);

      performanceStore.setHistorySize(historySize);
      performanceStore.setEnabled(true);

      if (performanceStartsPaused) performanceStore.setPaused(true);

      startPerformanceCollectors({
        sampleIntervalMs,
        longTaskThresholdMs,
        interactionThresholdMs,
      });

      configureStorageReads({ maxKeys: storageMaxKeys });
      if (storageAdapters?.length) {
        storageStore.setAdapters(
          resolveStorageAdapters(storageAdapters, { readOnly: storageReadOnly })
        );
      }
      storageStore.setEnabled(true);

      // Last, so the launcher button appears only once there is a working panel behind it. Anything
      // above throwing leaves the overlay hidden, which is the honest outcome.
      devtoolsReadyStore.markReady();
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
    /** Extra keys attached to every crash record from here on — user id, route, feature flags. */
    setCrashContext,
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
    storageStore,
    crashStore,
  };
}
