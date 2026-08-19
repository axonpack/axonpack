import type { ThemeConfig, ThemeId } from '../constants/theme.const';
import { configureRepl } from '../services/console/evaluate-expression.service';
import { patchConsole } from '../services/console/patch-console.service';
import {
  getWebViewConsoleInjectedJavaScript,
  handleWebViewConsoleMessage,
} from '../services/console/webview-console-logger.service';
import { configureCrashCapture, setCrashContext } from '../services/crash/capture-crash.service';
import { setCrashPopupDetail } from '../services/crash/crash-popup.service';
import { disableDefaultLogBox } from '../services/crash/disable-logbox.service';
import { installCrashHandlers } from '../services/crash/install-crash-handlers.service';
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
import {
  resolveStorageAdapters,
  type StorageAdapterDefinition,
} from '../services/storage/define-adapter.service';
import { configureStorageReads } from '../services/storage/read-storage.service';
import { consoleLogStore } from '../stores/console/console-log.store';
import { crashStore, type CrashRecord } from '../stores/crash/crash.store';
import { devtoolsReadyStore } from '../stores/devtools-ready.store';
import { networkConditionsStore } from '../stores/network/network-conditions.store';
import { networkLogStore } from '../stores/network/network-log.store';
import { performanceStore } from '../stores/performance/performance.store';
import { storageStore } from '../stores/storage/storage.store';
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

export type DevtoolsCrashConfig = {
  /** Capture at all. Defaults to `true`. */
  enabled?: boolean;
  /**
   * Keep capturing crashes even when the rest of the devtools is switched off. Defaults to `false`.
   *
   * "Switched off" means both ways of switching them off: `enabled: false`, **and an app that never
   * calls `init()` at all** — including the usual `if (__DEV__) devtools.init()`. So this flag
   * installs the crash handlers when the client is constructed rather than waiting for `init()`;
   * anything else would make the flag a promise the package doesn't keep.
   *
   * That makes it the one deliberate exception to "nothing in this package runs until `init()`".
   * Setting it *is* the consent that `init()` would otherwise have given, and it buys earlier
   * coverage: handlers installed at import catch errors thrown before `init()` would have run.
   *
   * It still brings nothing else with it — no panel, no REPL, no console capture, no request
   * bodies.
   */
  enableWhileDevtoolsDisabled?: boolean;
  /**
   * Which tiers to capture, when the devtools are enabled. All default to `true`.
   *
   * With the devtools **disabled**, only `nativeExceptions` runs whatever these say: the JS tiers
   * report errors the app survived, which is a developer's concern, and the sheet is in front of a
   * user there. A fatal JS error still arrives — React Native turns it into a native exception on
   * the way to killing the process, so the native handler picks it up.
   */
  handlers?: {
    /** `ErrorUtils` global handler — fatal and non-fatal JS errors. */
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
   * - `'full'` — tabs for Summary, Stack, Breadcrumbs, Device and Raw, with this package's own
   *   branding on the header. A debugging tool.
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
   * Attach the recent console and network entries to each record. Defaults to `__DEV__` — that
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
  /**
   * The package-wide gate. `false` makes `init()` a no-op for every subsystem *except* crash
   * capture, which has its own `crash.enableWhileDevtoolsDisabled` flag — so a release build can
   * call `init()` unconditionally and still ship nothing but the crash handlers.
   *
   * Defaults to `true`, which is the behaviour of an app that guards its own `init()` call.
   */
  enabled?: boolean;
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
    breadcrumbs: crashBreadcrumbs = __DEV__,
    maxBreadcrumbs = 25,
    maxRecords: maxCrashRecords = 25,
    persistNonFatal = false,
    redact: redactCrash,
    onCrash,
  } = config?.crash ?? {};

  const devtoolsEnabled = config?.enabled ?? true;

  /**
   * The crash subsystem is deliberately gated on its own flag rather than the package-wide one: it
   * is the only part of this package designed to run in a release build, and coupling it to
   * `enabled` would mean choosing between no crash reports and shipping the whole panel.
   *
   * Called from `init()`, above its `enabled` early return — and, when
   * `enableWhileDevtoolsDisabled` is set, from the factory itself, so it runs for an app that never
   * calls `init()`. Both paths are safe to hit: `installCrashHandlers` installs once per process and
   * everything else here is idempotent.
   *
   * `panelAvailable` is what `popupDetail: 'auto'` resolves against, and it is not the same thing as
   * `devtoolsEnabled`: the factory-time call cannot know whether `init()` is coming, so it takes the
   * compact sheet, and the `init()` call upgrades it if a panel really is going up.
   */
  function initCrashCapture(panelAvailable: boolean) {
    if (!crashEnabled) return;
    if (!devtoolsEnabled && !crashSurvivesDisabled) return;

    crashStore.setMaxRecords(maxCrashRecords);
    crashStore.setEnabled(true);
    setCrashPopupDetail(
      crashPopupDetail === 'auto' ? (panelAvailable ? 'full' : 'compact') : crashPopupDetail
    );
    configureCrashCapture({
      /**
       * Belt to the handler braces below. The JS handlers are not installed at all when the devtools
       * are off, but `DevtoolsErrorBoundary` calls `captureCrash` directly — it is a component the
       * app mounts, not a handler we install — so the policy has to live here too.
       */
      jsTiers: devtoolsEnabled,
      breadcrumbs: crashBreadcrumbs,
      maxBreadcrumbs,
      persistNonFatal,
      redact: redactCrash,
      onCrash,
    });
    // With the devtools off, only the tier that ends the process is installed — see `handlers`.
    installCrashHandlers({
      jsErrors: devtoolsEnabled && (crashHandlers?.jsErrors ?? true),
      unhandledRejections: devtoolsEnabled && (crashHandlers?.unhandledRejections ?? true),
      nativeExceptions: crashHandlers?.nativeExceptions ?? true,
    });

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
      // Re-run even when the factory already installed them: this is where a panel-backed `full`
      // sheet gets chosen, and where the config lands for an app that only calls `init()`.
      initCrashCapture(devtoolsEnabled);

      if (!devtoolsEnabled) return;

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
