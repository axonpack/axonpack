import type { BuiltInThemeId, ThemeConfig } from '../core/constants/theme.const';
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
import { observeNitroFetch } from '../features/network/services/nitro-fetch.service';
import { patchFetch } from '../features/network/services/patch-fetch.service';
import { patchWebSocket } from '../features/network/services/patch-websocket.service';
import { patchXHR } from '../features/network/services/patch-xhr.service';
import { setStreamCapture } from '../features/network/services/record-stream-events.service';
import {
  getWebViewConditionsRef,
  getWebViewUserAgent,
  shouldAllowWebViewRequest,
} from '../features/network/services/webview-conditions.service';
import {
  getWebViewInjectedJavaScriptBeforeContentLoaded,
  handleWebViewNetworkMessage,
  setWebViewSocketCapture,
  setWebViewStreamCapture,
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

/**
 * The switches name the **kind of traffic**, not the mechanism that carried it. A request is a request
 * whether it went out through `fetch`, through `XMLHttpRequest`, from a JSI client or from inside a
 * page, and someone turning requests off means all of them — the transports are this package's problem
 * and there are already five of them. Every one defaults to `true`.
 */
export type DevtoolsNetworkConfig = {
  /**
   * Plain requests, however they were made: `fetch`, Expo's own fetch, `XMLHttpRequest`, a JSI
   * client, and a page's own requests. Each becomes a row in the Network tab. Defaults to `true`.
   *
   * Off also means no phase timing, since there is nothing to time.
   */
  http?: boolean;
  /**
   * WebSocket connections, the app's own and a page's. The connection is a row in the Network tab
   * and its messages are listed under that row's Events tab. Defaults to `true`.
   */
  websocket?: boolean;
  /**
   * Server-sent event streams and their events, whichever client opened them — a stream is a row in
   * the Network tab and its events are listed under that row's Events tab. Defaults to `true`.
   *
   * The app's own stream is still recognised as one with this off — its endless body has to be, or it
   * would be read as a response — so the row remains and only the events are dropped. A page's stream
   * has no request underneath it that anything here can see, so that one disappears entirely.
   */
  sse?: boolean;
  /**
   * Open the Network tab with recording paused, so nothing is logged until the record button in its
   * toolbar is pressed. Defaults to `false`.
   *
   * Interception is still installed either way — this is the pause button's starting position, not
   * a way to keep the patches out of the app.
   */
  disabledByDefault?: boolean;
};

/** Everything the Console tab does. Both switches default to `true`. */
export type DevtoolsConsoleConfig = {
  /**
   * Mirror `console.log` / `.warn` / `.error` / `.info` / `.debug` into the Console tab, the app's
   * own and a declared WebView's. Defaults to `true`.
   *
   * The original console keeps working — Metro still gets every call.
   */
  capture?: boolean;
  /**
   * The `>` prompt at the bottom of the Console tab, for evaluating expressions against the running
   * app. Defaults to `true`. Turn it off to ship the log view without a way to execute code.
   */
  repl?: boolean;
  /**
   * Extra values the `>` prompt can reach by name, on top of the app's globals — handy for the
   * things a REPL cannot import for itself, such as a store instance or a helper:
   *
   * ```ts
   * console: { context: { store, resetOnboarding } }
   * ```
   *
   * Empty by default.
   */
  context?: Record<string, unknown>;
  /**
   * Open the Console tab with recording paused, so nothing is logged until the record button in its
   * toolbar is pressed. Defaults to `false`. The `>` prompt still answers while paused.
   */
  disabledByDefault?: boolean;
};

/**
 * What the Performance tab samples and how much of it it keeps. The defaults are tuned to stay out
 * of the way of the app being measured; raise the thresholds to see less, lower them to see more.
 */
export type DevtoolsPerformanceConfig = {
  /**
   * How often JS heap and system metrics are sampled, in milliseconds. Defaults to `1000`.
   *
   * Each sample crosses into the JS engine to read its heap, so a very short interval makes the
   * profiler part of what it is measuring. A second is enough to watch a leak grow.
   */
  sampleIntervalMs?: number;
  /**
   * Shortest JS-thread block, in milliseconds, that is worth listing as a long task. Defaults to
   * `150`. Anything faster than this is dropped rather than shown.
   */
  longTaskThresholdMs?: number;
  /**
   * Shortest interaction — a tap or key press — in milliseconds that is worth recording, measured
   * from the event to the end of its handling. Defaults to `100`; values below `16` (one frame) are
   * raised to it, since the platform cannot report finer.
   */
  interactionThresholdMs?: number;
  /**
   * Entries kept per series — memory samples, long tasks, interactions, user timings. Defaults to
   * `120`, i.e. two minutes of samples at the default interval. Oldest are dropped first.
   */
  historySize?: number;
  /**
   * Open the Performance tab with recording paused. Defaults to `true` here, unlike the other tabs:
   * the collectors keep a frame loop and an interval running, so they start only when the record
   * button asks for them.
   */
  disabledByDefault?: boolean;
};

/**
 * Crash reporting: which crashes are caught, what the sheet in front of the user looks like, and
 * where records go afterwards. The only part of this package that can run without `init()` — see
 * `enableWhileDevtoolsDisabled`.
 */
export type DevtoolsCrashConfig = {
  /**
   * Whether crashes are captured at all. Defaults to `true`.
   *
   * Set it to `false` to ship the panel without crash reporting; nothing is installed and the crash
   * sheet never appears.
   */
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
   *
   * **If the app already has a crash reporter — Sentry, Crashlytics — these are the switches that
   * decide who sees what.** The two JS tiers use the same hooks such a reporter does:
   *
   * - `jsErrors` wraps React Native's global handler and passes every error on, fatal or not, so a
   *   reporter installed before this one sees all of them.
   * - `unhandledRejections` takes a single-slot API with nothing to chain to, so whichever of the
   *   two is initialised last wins outright. Turn it off to leave the slot to the reporter.
   * - `nativeExceptions` always chains to the handler that was already installed, so a native crash
   *   reaches every reporter regardless.
   *
   * `onCrash` is the other way round: leave the tiers on and forward each record yourself.
   */
  handlers?: {
    /**
     * `ErrorUtils` global handler — fatal and non-fatal JS errors.
     *
     * Installing it also stops a fatal error from ending the app: React Native is what reports one to
     * the native side, and this handler is what withholds it. Turning the tier off hands that back,
     * so the app crashes the way it would without this package.
     *
     * Defaults to `true`.
     */
    jsErrors?: boolean;
    /**
     * Unhandled promise rejections — the tier that adds the most in a development build, since React
     * Native registers its own tracker only under `__DEV__`.
     *
     * Defaults to `true`.
     */
    unhandledRejections?: boolean;
    /**
     * Uncaught Java/Kotlin and Objective-C exceptions, via the native module. Defaults to `true`,
     * and is the one tier that also runs before `init()` — see `enableWhileDevtoolsDisabled`.
     */
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
  /**
   * Intended cap on how many breadcrumbs travel with a record.
   *
   * Not honoured yet: the trail is currently everything the Console and Network tabs were holding,
   * so setting this changes nothing. Kept because the field is public API.
   */
  maxBreadcrumbs?: number;
  /** How many crash reports the Crash tab keeps, oldest dropped first. Defaults to `25`. */
  maxRecords?: number;
  /**
   * Also write non-fatal records to disk. Off by default: the app survived them, so they are already
   * in the panel, and persisting one means reporting it again at the next launch.
   */
  persistNonFatal?: boolean;
  /**
   * Your chance to strip anything sensitive before a record is stored, written to disk or handed to
   * `onCrash`. Return the record to keep — edited or not — or `null` to drop it entirely. No
   * redaction by default.
   *
   * ```ts
   * redact: (record) => ({ ...record, context: { ...record.context, token: undefined } })
   * ```
   */
  redact?: (record: CrashRecord) => CrashRecord | null;
  /**
   * Called once per crash, after `redact`, with the record that was stored — the hook for forwarding
   * to Sentry, Crashlytics or your own endpoint.
   *
   * It runs inside the crash handler, so keep it cheap and never let it throw: fire the report and
   * return. Not called for a record `redact` dropped.
   */
  onCrash?: (record: CrashRecord) => void;
};

/**
 * The Storage tab. Nothing is discovered automatically, so `adapters` is the whole of what the tab
 * can see; the rest bounds how much it reads and whether it may write.
 */
export type DevtoolsStorageConfig = {
  /**
   * The stores to inspect, built with `asyncStorageAdapter` / `mmkvAdapter` /
   * `secureStoreAdapter` / `defineStorageAdapter`. Nothing is discovered automatically — this
   * package depends on no storage library, so this list is the whole of what the tab can see.
   *
   * ```ts
   * storage: { adapters: [asyncStorageAdapter({ driver: AsyncStorage })] }
   * ```
   *
   * Empty by default, which leaves the Storage tab with nothing to show.
   */
  adapters?: readonly StorageAdapterDefinition[];
  /**
   * How many keys are read per store before the tab stops and reports how many it skipped. Defaults
   * to `1000`. Raise it for a store with more keys than that, at the cost of a slower refresh.
   */
  maxKeys?: number;
  /**
   * Make every registered store read-only, so the tab can inspect values but not edit or delete
   * them. Defaults to `false`. An individual adapter's own `readOnly` wins over this.
   */
  readOnly?: boolean;
};

/**
 * Everything `createDevtoolsClient` accepts. Every field is optional and the defaults suit most
 * apps — a bare `createDevtoolsClient()` captures requests, console output and crashes.
 *
 * The two type parameters are inferred from the config you pass; you never write them out.
 */
export type DevtoolsClientConfig<
  TWebviewSources extends readonly string[],
  TThemeName extends string = never,
> = {
  // `NoInfer` is what closes the set: without it this property is an inference site of its own, so
  // a name that was never registered would widen `TThemeName` rather than fail to compile.
  /**
   * The theme the panel opens on. Accepts a built-in palette id — `'light'`, `'dark'`, `'dracula'`,
   * `'nord'`, `'monokai'`, `'one-dark'`, `'solarized-light'` — or the name of a theme declared in
   * `themes`. An unknown name is a type error. Defaults to `'light'`.
   *
   * The theme picker in the panel header overrides this for the current session; the selection is
   * not persisted.
   */
  defaultTheme?: BuiltInThemeId | NoInfer<TThemeName>;
  /**
   * Custom themes, keyed by the name shown in the panel's theme picker. A theme patches a built-in
   * palette rather than defining every colour:
   *
   * ```ts
   * themes: { midnight: { base: 'dark', colors: { accent: '#a78bfa' } } }
   * ```
   *
   * A name declared here becomes a valid value for `defaultTheme`.
   */
  themes?: Record<TThemeName, ThemeConfig>;
  /**
   * Names for the WebViews the panel captures from. A name labels one WebView's requests and
   * console output, and is what you pass when wiring that WebView up:
   *
   * ```tsx
   * <WebView
   *   injectedJavaScriptBeforeContentLoaded={devtools.getWebViewInjectedJavaScriptBeforeContentLoaded('checkout')}
   *   onMessage={devtools.handleWebViewMessage}
   * />
   * ```
   *
   * The list is both the accepted set of names and a runtime allowlist: an undeclared name is a
   * type error at the call site, and `handleWebViewMessage` ignores messages from a source that is
   * not listed. Omit it and messages from any source are accepted.
   *
   * It sits at the top level rather than under `network` because the Console tab captures from a
   * declared WebView as well.
   */
  webviewSources?: TWebviewSources;
  /** The Network tab: which kinds of traffic are captured, and whether it starts recording. */
  network?: DevtoolsNetworkConfig;
  /** The Console tab: log capture, the `>` prompt, and what that prompt can reach. */
  console?: DevtoolsConsoleConfig;
  /** The Performance tab: sampling rate, what counts as slow, and how much history is kept. */
  performance?: DevtoolsPerformanceConfig;
  /** The Storage tab: which stores it can see. Nothing is inspected until you register one here. */
  storage?: DevtoolsStorageConfig;
  /** Crash reporting: which crashes are caught, what the sheet shows, and where records go. */
  crash?: DevtoolsCrashConfig;
};

/**
 * Creates the devtools client — the package's one entry point. Call it once, at module scope, and
 * export the result so the rest of the app can reach it.
 *
 * It only builds the client: `init()` is what installs the instrumentation, and `<DevtoolsOverlay />`
 * is what renders the panel.
 *
 * ```ts
 * export const devtools = createDevtoolsClient({ defaultTheme: 'dark' });
 * if (__DEV__) devtools.init();
 * ```
 *
 * Every option is optional — `createDevtoolsClient()` captures requests, console output and crashes
 * with sensible defaults. See `DevtoolsClientConfig` for what can be configured.
 */
export function createDevtoolsClient<
  const TWebviewSources extends readonly string[] = readonly string[],
  TThemeName extends string = never,
>(config?: DevtoolsClientConfig<TWebviewSources, TThemeName>) {
  const webviewSources = config?.webviewSources;
  const {
    http: captureHttp = true,
    websocket: captureSockets = true,
    sse: captureStreams = true,
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
    /**
     * Starts the devtools: installs the network and console patches, attaches the crash handlers and
     * makes the overlay appear. Call it once, as early in startup as possible.
     *
     * Nothing in this package records anything until this runs, so wrapping the call is the whole
     * production gate:
     *
     * ```ts
     * if (__DEV__) devtools.init();
     * ```
     */
    init() {
      // First among the subsystems, so the handlers are already listening if anything below throws.
      // Safe to re-run when the factory already installed the native tier: this is where the JS
      // tiers get added and the full sheet takes over.
      initCrashCapture(true);

      networkLogStore.setEnabled(true);
      if (networkStartsPaused) networkLogStore.setPaused(true);
      if (captureHttp) {
        // Every transport a request can leave by, which is what one switch over requests has to mean.
        patchFetch();
        patchXHR();
        // Before the app's first request on purpose: on Android the phase listener goes in by
        // replacing React Native's OkHttp client factory, and that client is built once, on first use.
        installNativeTimingReporter();
      }
      if (captureSockets) patchWebSocket();
      // One observer carries both of that client's kinds, so it is told which of them are wanted
      // rather than being attached or not.
      observeNitroFetch({ http: captureHttp, websocket: captureSockets });
      // The page's own of each, which no patch above can see: a page runs in its own engine.
      setWebViewSocketCapture(captureSockets);
      setWebViewStreamCapture(captureStreams);
      setStreamCapture(captureStreams);
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
    /**
     * The script that makes one WebView's requests and logs visible to the panel. A page runs in its
     * own JS engine, so it has to be instrumented from the inside.
     *
     * Pass a name from `webviewSources`, hand the result to `injectedJavaScriptBeforeContentLoaded`,
     * and wire `onMessage` to `handleWebViewMessage` — without both halves nothing arrives.
     */
    getWebViewInjectedJavaScriptBeforeContentLoaded(source: TWebviewSources[number]) {
      const scripts = [getWebViewInjectedJavaScriptBeforeContentLoaded(source)];
      if (captureConsole) scripts.push(getWebViewConsoleInjectedJavaScript(source));
      return scripts.join('\n');
    },
    /**
     * Records a named point in time, shown under User timing in the Performance tab. The app's own
     * equivalent of `performance.mark`.
     *
     * ```ts
     * devtools.mark('checkout:start');
     * ```
     */
    mark(name: string, options?: MarkOptions) {
      recordMark(name, options);
    },
    /**
     * Records a named duration, shown under User timing in the Performance tab. Takes two marks, or
     * an options object with explicit `start` / `end` / `duration` values:
     *
     * ```ts
     * devtools.measure('checkout', 'checkout:start', 'checkout:done');
     * devtools.measure('checkout', { duration: 820 });
     * ```
     *
     * With no start given, the mark of the same name is used; with no end, now. Passing `start`,
     * `end` and `duration` together throws, since the three can disagree.
     */
    measure(name: string, startOrOptions?: string | MeasureOptions, endMark?: string) {
      recordMeasure(name, startOrOptions, endMark);
    },
    /** Drops recorded marks — the one named, or all of them when called with no name. */
    clearMarks(name?: string) {
      clearRecordedMarks(name);
    },
    /** Drops recorded measures — the one named, or all of them when called with no name. */
    clearMeasures(name?: string) {
      clearRecordedMeasures(name);
    },
    /**
     * Extra keys attached to every crash record from here on — user id, current route, feature
     * flags. Empty until you call this.
     *
     * Each call **replaces** the whole context rather than merging into it; pass `null` to clear it.
     *
     * ```ts
     * devtools.setCrashContext({ userId: user.id, route: 'checkout' });
     * ```
     */
    setCrashContext,
    /**
     * Whether a WebView should be allowed to load right now — `false` while the Network tab's
     * conditions are set to offline. Use it in `onShouldStartLoadWithRequest` so a page obeys the
     * offline switch the way the app's own requests do.
     */
    shouldAllowWebViewRequest,
    /**
     * The other half of the WebView wiring: give this to a WebView's `onMessage` and the panel
     * receives that page's requests and logs.
     *
     * Returns `true` when the message was one of ours, so an app that also uses `postMessage` for
     * its own purposes can pass on the rest:
     *
     * ```tsx
     * onMessage={(event) => {
     *   if (devtools.handleWebViewMessage(event)) return;
     *   handleMyOwnMessage(event);
     * }}
     * ```
     */
    handleWebViewMessage(event: WebViewMessageEventLike) {
      if (handleWebViewNetworkMessage(event, webviewSources)) return true;
      return captureConsole && handleWebViewConsoleMessage(event, webviewSources);
    },
    /**
     * A `ref` callback for one declared WebView, which lets the panel push network conditions —
     * offline, throttling, a custom user agent — into that page. Optional: without it the WebView
     * still logs, it just ignores those conditions.
     *
     * ```tsx
     * <WebView ref={devtools.getWebViewRef('checkout')} />
     * ```
     */
    getWebViewRef(source: TWebviewSources[number]) {
      return getWebViewConditionsRef(source);
    },
    /**
     * The user agent currently set in the Network tab's conditions, or `undefined` when none is.
     * Pass it to a WebView's `userAgent` prop so the page identifies itself the way the panel says.
     */
    getWebViewUserAgent,
    /** The captured requests, for reading or clearing them from code. */
    networkLogStore,
    /** The Network tab's conditions — offline, throttling, user agent — settable from code. */
    networkConditionsStore,
    /** The captured console entries, for reading or clearing them from code. */
    consoleLogStore,
    /** The registered stores and the keys last read from them. */
    storageStore,
    /** The crash records held in memory, for reporting or clearing them from code. */
    crashStore,
  };
}
