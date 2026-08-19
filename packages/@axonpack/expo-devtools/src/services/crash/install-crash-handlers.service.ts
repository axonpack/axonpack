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

let installed = false;

/**
 * React Native installs its own global handler at startup (`setUpErrorHandling.js`), so ours wraps
 * rather than replaces: capture first, then hand the error on untouched. Passing it on is what keeps
 * LogBox, the red box and RN's own native reporting working — and, for a fatal error, what lets the
 * process end the way React Native intends.
 */
function installJsErrorHandler() {
  const errorUtils = (globalThis as ErrorUtilsHost).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;

  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    captureCrash(error, isFatal ? 'js-fatal' : 'js-error');
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
 * `enablePromiseRejectionTracker` is a **single-slot** API — installing ours displaces whatever was
 * there. In production nothing was: RN only registers its tracker under `__DEV__`
 * (`Libraries/Core/polyfillPromise.js`), so an unhandled rejection in a release build is currently
 * silent, and this is the tier that adds the most coverage.
 *
 * In development it *does* displace RN's, which is what feeds LogBox. Re-emitting through
 * `console.error` restores that: RN's `installConsoleErrorReporter` routes `console.error` into
 * LogBox, so the yellow/red box still appears. Doing it that way rather than importing
 * `ExceptionsManager` keeps us off a deep, version-specific path into RN's internals.
 */
function installRejectionHandler() {
  const hermes = (globalThis as ErrorUtilsHost).HermesInternal;
  if (!hermes?.enablePromiseRejectionTracker) return;

  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (id, rejection) => {
      const error =
        rejection instanceof Error
          ? rejection
          : new Error(`Unhandled promise rejection: ${describeRejection(rejection)}`);
      captureCrash(error, 'unhandled-rejection');

      if (__DEV__) {
        console.error(`Uncaught (in promise, id: ${id}): ${describeRejection(rejection)}`);
      }
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
 */
function drainPreviousLaunchCrashes() {
  for (const partial of drainNativeCrashRecords()) adoptPersistedCrash(partial);
}

export function installCrashHandlers(config: CrashHandlerConfig) {
  if (installed) return;
  installed = true;

  if (config.jsErrors) installJsErrorHandler();
  if (config.unhandledRejections) installRejectionHandler();
  if (config.nativeExceptions) installNativeCrashHandler();

  // Always drained, even with native capture off: the records may predate that being turned off,
  // and leaving them on disk would mean reporting them at some arbitrary later launch instead.
  drainPreviousLaunchCrashes();
}

/** Test-only; handlers are installed once per process. */
export function resetCrashHandlers() {
  installed = false;
}
