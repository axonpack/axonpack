import { requireOptionalNativeModule } from 'expo';

import { performanceStore } from '../stores/performance.store';

type UiFpsNativeModule = {
  startUiFpsTracking: () => void;
  stopUiFpsTracking: () => void;
  getUiFps: () => number;
};

const native = requireOptionalNativeModule<UiFpsNativeModule>('AxonpackDevtools');

export function isUiFpsAvailable(): boolean {
  return native != null;
}

const WINDOW_MS = 500;

const MIN_WINDOW_MS = WINDOW_MS / 2;

function runFpsMonitor() {
  let frames = 0;
  let windowStart = Date.now();
  let handle: ReturnType<typeof requestAnimationFrame> | undefined;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    frames += 1;
    handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);

  try {
    native?.startUiFpsTracking();
  } catch {}

  const interval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - windowStart;
    if (elapsed < MIN_WINDOW_MS) return;
    performanceStore.setFps(Math.round((frames * 1000) / elapsed));
    frames = 0;
    windowStart = now;

    try {
      const reported = native?.getUiFps();

      if (reported !== undefined) {
        performanceStore.setUiFps(reported < 0 ? undefined : Math.round(reported));
      }
    } catch {}
  }, WINDOW_MS);

  return () => {
    stopped = true;
    clearInterval(interval);
    if (handle !== undefined) cancelAnimationFrame(handle);
    try {
      native?.stopUiFpsTracking();
    } catch {}
    performanceStore.setFps(undefined);
    performanceStore.setUiFps(undefined);
  };
}

let users = 0;
let stopRunning: (() => void) | undefined;

/**
 * Joins the one frame counter the app has, starting it for the first user. The in-app panel and the
 * DevTools tab can both be open, and two counters would each write a reading, doubling the chart's
 * speed, and the first to stop would kill the native counter under the other.
 */
export function startFpsMonitor() {
  users += 1;
  if (users === 1) stopRunning = runFpsMonitor();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    users -= 1;
    if (users > 0) return;
    stopRunning?.();
    stopRunning = undefined;
  };
}
