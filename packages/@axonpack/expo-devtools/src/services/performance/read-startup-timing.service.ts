import { performanceStore, type StartupTiming } from '../../stores/performance/performance.store';

/**
 * The getter was renamed across RN versions — `reactNativeStartupTiming` on older releases,
 * `rnStartupTiming` on current ones — so both are probed. Reading it throws on a runtime with no
 * native Performance module at all, which is why the whole thing is wrapped.
 */
type StartupTimingHost = {
  rnStartupTiming?: StartupTiming;
  reactNativeStartupTiming?: StartupTiming;
};

function normalize(raw: StartupTiming): StartupTiming {
  // The values arrive as getters on a platform object with `?number` fields; null and undefined both
  // mean "the platform didn't report this", and the UI only distinguishes present from absent.
  return {
    startTime: raw.startTime ?? undefined,
    endTime: raw.endTime ?? undefined,
    initializeRuntimeStart: raw.initializeRuntimeStart ?? undefined,
    executeJavaScriptBundleEntryPointStart: raw.executeJavaScriptBundleEntryPointStart ?? undefined,
  };
}

export function readStartupTiming() {
  const host = globalThis.performance as unknown as StartupTimingHost | undefined;
  if (!host) return;
  try {
    const raw = host.rnStartupTiming ?? host.reactNativeStartupTiming;
    if (raw) performanceStore.setStartup(normalize(raw));
  } catch {
    // No native Performance module — the tab shows the section as unavailable instead.
  }
}
