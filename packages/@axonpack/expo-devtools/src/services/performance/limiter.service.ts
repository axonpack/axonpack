import { requireOptionalNativeModule } from 'expo';

type LimiterNativeModule = {
  blockMainThread: (durationMs: number) => void;
  crashMainThread: (message: string) => void;
};

/**
 * Optional on purpose. The main-thread half needs native code, but the JS-thread half doesn't — so an
 * app running in Expo Go, or one that simply hasn't rebuilt, keeps everything except the two buttons
 * that reach the main thread. `requireOptionalNativeModule` returns null instead of throwing, which is
 * what makes that graceful.
 */
const native = requireOptionalNativeModule<LimiterNativeModule>('AxonpackDevtools');

export function isMainThreadLimiterAvailable(): boolean {
  return native != null;
}

/**
 * Busy-waits rather than sleeping. `await new Promise(r => setTimeout(r, ms))` would hand the thread
 * straight back to the event loop, which is the opposite of the point — nothing would be blocked and
 * the Performance tab would record nothing.
 */
export function blockJsThread(durationMs: number) {
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    // Deliberately empty: occupy the thread rather than yield it.
  }
}

export function blockMainThread(durationMs: number) {
  native?.blockMainThread(durationMs);
}

/**
 * Not gated on `__DEV__`: the crash paths work wherever the panel does. Nothing reaches them unless a
 * user opens the Limiter and taps twice, and the panel itself only exists once `init()` has run — so
 * guarding the `.init()` call is what keeps this out of a release, the same as every other capability
 * in this package.
 */
export function crashJsThread(message: string) {
  throw new Error(message);
}

export function crashMainThread(message: string) {
  native?.crashMainThread(message);
}
