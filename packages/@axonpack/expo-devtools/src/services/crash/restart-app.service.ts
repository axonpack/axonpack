import { requireOptionalNativeModule } from 'expo';

type RestartNativeModule = {
  /** Android only — see the Swift module for why there is no iOS counterpart. */
  restartApp?: () => void;
};

const native = requireOptionalNativeModule<RestartNativeModule>('AxonpackDevtools');

/**
 * False on iOS, and false without a dev build.
 *
 * Apple offers no supported way to relaunch or terminate an app from inside it — `exit(0)` is a
 * documented App Store rejection — so the crash sheet asks this before offering the button rather
 * than shipping one that does nothing on half the devices it runs on.
 */
export function canRestartApp(): boolean {
  return typeof native?.restartApp === 'function';
}

export function restartApp() {
  try {
    native?.restartApp?.();
  } catch {
    // The app stays up and the sheet stays open, which beats throwing out of a crash reporter.
  }
}
