import { requireOptionalNativeModule } from 'expo';

import { performanceStore } from '../../stores/performance/performance.store';

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
/**
 * A window this much shorter than intended is discarded rather than published. `setInterval` fires
 * early after the JS thread has been stalled, and dividing a frame count by a 1ms window produced
 * readings like 1005fps — a number no display can show, which then became the chart's ceiling.
 */
const MIN_WINDOW_MS = WINDOW_MS / 2;

/**
 * Counts frames with `requestAnimationFrame` but publishes from a `setInterval`, so a window always
 * closes on schedule. Doing the arithmetic inside the rAF callback meant that if rAF never fired —
 * which is what a stalled or unscheduled frame loop looks like — nothing was ever published and the
 * card showed a dash forever, indistinguishable from "not measured". A window that reports 0 says
 * the frame loop isn't running, which is information.
 *
 * Not started by the collector service: the loop keeps the JS thread awake for as long as it lives,
 * so the view owns it and tears it down when the tab closes.
 *
 * It measures the *JS* thread only. UI-thread jank happens on another thread and is invisible here.
 */
export function startFpsMonitor() {
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

  // The main thread's own counter runs natively and is only read here, on the same schedule.
  try {
    native?.startUiFpsTracking();
  } catch {
    // Optional: without the native module only the JS figure is available.
  }

  const interval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - windowStart;
    if (elapsed < MIN_WINDOW_MS) return;
    performanceStore.setFps(Math.round((frames * 1000) / elapsed));
    frames = 0;
    windowStart = now;

    try {
      const reported = native?.getUiFps();
      // -1 is the tracker's "no window has closed yet", which is not a real zero.
      if (reported !== undefined) {
        performanceStore.setUiFps(reported < 0 ? undefined : Math.round(reported));
      }
    } catch {
      // Ignore: the JS figure above is still valid.
    }
  }, WINDOW_MS);

  return () => {
    stopped = true;
    clearInterval(interval);
    if (handle !== undefined) cancelAnimationFrame(handle);
    try {
      native?.stopUiFpsTracking();
    } catch {
      // Nothing to stop.
    }
    performanceStore.setFps(undefined);
    performanceStore.setUiFps(undefined);
  };
}
