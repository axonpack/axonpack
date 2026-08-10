import { performanceStore } from '../../stores/performance/performance.store';

const WINDOW_MS = 500;

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

  const interval = setInterval(() => {
    const now = Date.now();
    const elapsed = Math.max(1, now - windowStart);
    performanceStore.setFps(Math.round((frames * 1000) / elapsed));
    frames = 0;
    windowStart = now;
  }, WINDOW_MS);

  return () => {
    stopped = true;
    clearInterval(interval);
    if (handle !== undefined) cancelAnimationFrame(handle);
    performanceStore.setFps(undefined);
  };
}
