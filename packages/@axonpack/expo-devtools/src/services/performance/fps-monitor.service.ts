import { performanceStore } from '../../stores/performance/performance.store';

/**
 * A `requestAnimationFrame` delta loop keeps the JS thread awake for as long as it runs, which would
 * itself distort idle-time measurements — so unlike the other collectors this one is started by the
 * view and torn down the moment the tab stops being visible, never from `init()`.
 *
 * It measures the *JS* thread only. UI-thread jank (a heavy native layout, a slow scroll) happens on
 * another thread entirely and is structurally invisible here; that would need native instrumentation.
 */
export function startFpsMonitor() {
  let frames = 0;
  let windowStart = Date.now();
  let handle: ReturnType<typeof requestAnimationFrame> | undefined;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    frames += 1;
    const now = Date.now();
    const elapsed = now - windowStart;
    if (elapsed >= 500) {
      performanceStore.setFps(Math.round((frames * 1000) / elapsed));
      frames = 0;
      windowStart = now;
    }
    handle = requestAnimationFrame(tick);
  };

  handle = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    if (handle !== undefined) cancelAnimationFrame(handle);
    performanceStore.setFps(undefined);
  };
}
