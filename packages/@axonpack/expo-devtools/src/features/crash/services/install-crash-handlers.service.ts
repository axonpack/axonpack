import { adoptPersistedCrash, captureCrash } from './capture-crash.service';
import { drainNativeCrashRecords, installNativeCrashHandler } from './native-crash.service';

export type CrashHandlerConfig = {
  jsErrors: boolean;
  unhandledRejections: boolean;
  nativeExceptions: boolean;
};

type ErrorHandler = (error: unknown, isFatal: boolean) => void;

type ErrorUtilsHost = {
  ErrorUtils?: {
    getGlobalHandler?: () => ErrorHandler | undefined;
    setGlobalHandler?: (handler: ErrorHandler) => void;
  };
  HermesInternal?: {
    enablePromiseRejectionTracker?: (options: {
      allRejections: boolean;
      onUnhandled: (id: number, rejection: unknown) => void;
      onHandled: (id: number) => void;
    }) => void;
  };
};

/**
 * Per tier, not one flag for the lot: `enableWhileDevtoolsDisabled` installs the native tier when
 * the client is built, and a later `init()` has to be able to add the JS tiers on top. A single
 * `installed` guard would have silently refused that second call.
 */
const installed = {
  jsErrors: false,
  unhandledRejections: false,
  nativeExceptions: false,
  drained: false,
};

/**
 * React Native installs its own global handler at startup (`setUpErrorHandling.js`), so ours wraps
 * rather than replaces: capture first, then hand the error on untouched, fatal or not. Passing it on
 * is what keeps LogBox, the red box and RN's own native reporting working, what lets a fatal error
 * end the process the way React Native intends, and what keeps another reporter's own `ErrorUtils`
 * wrapper — which is exactly what `previous` is when Sentry or Crashlytics went in first — seeing
 * every error this one sees.
 */
function installJsErrorHandler() {
  const errorUtils = (globalThis as ErrorUtilsHost).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    captureCrash(error, isFatal ? 'js-fatal' : 'js-error');

    // Recorded, then passed on untouched. A fatal error ends the app from here: React Native's own
    // handler is what reports it to the native side, and that report is what kills the process, so
    // the crash arrives at the next launch as the native exception it became and every other
    // reporter sees it too. In development that handler draws the red box instead of reporting
    // anything, so the app carries on there as it always has.
    previous?.(error, isFatal);
  });
}

function describeRejection(rejection: unknown): string {
  if (rejection instanceof Error) return `${rejection.name}: ${rejection.message}`;
  if (typeof rejection === 'string') return rejection;
  try {
    return JSON.stringify(rejection) ?? String(rejection);
  } catch {
    return String(rejection);
  }
}

/**
 * Two things worth knowing here.
 *
 * `enablePromiseRejectionTracker` is a **single-slot** API with no getter — installing ours displaces
 * whatever was there, and there is nothing to chain to. In production nothing was there: RN only
 * registers its tracker under `__DEV__` (`Libraries/Core/polyfillPromise.js`), so an unhandled
 * rejection in a release build is otherwise silent, and this is the tier that adds the most coverage.
 * An app whose own reporter wants this slot has to turn the tier off — see `handlers` in the client
 * config.
 *
 * In development it *does* displace RN's, which is what feeds LogBox — so the rejection is re-emitted
 * through `console.error`, which RN's `installConsoleErrorReporter` routes into LogBox. That keeps us
 * off a deep, version-specific path into `ExceptionsManager`, and the console patch recognises the
 * error it just linked, so the re-emit reaches the real console without writing a second row.
 */
function installRejectionHandler() {
  const hermes = (globalThis as ErrorUtilsHost).HermesInternal;
  if (!hermes?.enablePromiseRejectionTracker) return;

  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (_id, rejection) => {
      const error =
        rejection instanceof Error
          ? rejection
          : new Error(`Unhandled promise rejection: ${describeRejection(rejection)}`);
      captureCrash(error, 'unhandled-rejection');
      if (__DEV__) console.error(error);
    },
    onHandled: (id) => {
      if (__DEV__) {
        console.warn(
          `Promise rejection handled (id: ${id})\n` +
            'This means you can ignore any previous messages of the form ' +
            `"Uncaught (in promise, id: ${id})"`
        );
      }
    },
  });
}

/**
 * Anything the native handler wrote is by definition from a run that already ended — the file is
 * drained at startup, so a record still in it outlived the process that made it.
 *
 * Exported and called separately from installing the handlers, because adopting a record now also
 * writes a console row, and the console store is not recording yet at the point the handlers go in.
 * Draining there dropped the row on the floor with nothing to show it had happened.
 */
export function drainPreviousLaunchCrashes() {
  for (const partial of drainNativeCrashRecords()) adoptPersistedCrash(partial);
}

export function installCrashHandlers(config: CrashHandlerConfig) {
  if (config.jsErrors && !installed.jsErrors) {
    installed.jsErrors = true;
    installJsErrorHandler();
  }
  if (config.unhandledRejections && !installed.unhandledRejections) {
    installed.unhandledRejections = true;
    installRejectionHandler();
  }
  if (config.nativeExceptions && !installed.nativeExceptions) {
    installed.nativeExceptions = true;
    installNativeCrashHandler();
  }
}

/**
 * Always drained, even with native capture off: the records may predate that being turned off, and
 * leaving them on disk would mean reporting them at some arbitrary later launch instead. Once per
 * process, whoever asks first.
 */
export function drainOnce() {
  if (installed.drained) return;
  installed.drained = true;
  drainPreviousLaunchCrashes();
}

/** Test-only; each tier installs once per process. */
export function resetCrashHandlers() {
  installed.jsErrors = false;
  installed.unhandledRejections = false;
  installed.nativeExceptions = false;
  installed.drained = false;
}
