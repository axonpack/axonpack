import { requireOptionalNativeModule } from 'expo';

import { performanceStore, type StartupTiming } from '../../stores/performance/performance.store';

/**
 * Captured at module evaluation, i.e. while the JS bundle is still being executed. Its accuracy depends
 * on where this package sits in the import graph — it is "when devtools loaded", not "when the bundle
 * started" — which is why the UI labels the phase rather than claiming a platform milestone.
 */
const JS_BUNDLE_EVAL_MS = Date.now();

type StartupNativeModule = {
  getStartupTimestamps: () => {
    processStartMs?: number | null;
    nativeModuleInitMs?: number | null;
  };
};

const native = requireOptionalNativeModule<StartupNativeModule>('AxonpackDevtools');

type PlatformStartupHost = {
  rnStartupTiming?: StartupTiming;
  reactNativeStartupTiming?: StartupTiming;
};

let initCalledMs: number | undefined;
let firstRenderMs: number | undefined;

/** The platform getter was renamed across RN versions, so both names are probed. */
function readPlatformMarkers(): Partial<StartupTiming> {
  const host = globalThis.performance as unknown as PlatformStartupHost | undefined;
  if (!host) return {};
  try {
    const raw = host.rnStartupTiming ?? host.reactNativeStartupTiming;
    if (!raw) return {};
    return {
      startTime: raw.startTime ?? undefined,
      endTime: raw.endTime ?? undefined,
      initializeRuntimeStart: raw.initializeRuntimeStart ?? undefined,
      executeJavaScriptBundleEntryPointStart:
        raw.executeJavaScriptBundleEntryPointStart ?? undefined,
    };
  } catch {
    // No native Performance module at all.
    return {};
  }
}

function readNativeMarkers(): Partial<StartupTiming> {
  if (native == null) return {};
  try {
    const { processStartMs, nativeModuleInitMs } = native.getStartupTimestamps();
    return {
      processStart: processStartMs ?? undefined,
      nativeModuleInit: nativeModuleInitMs ?? undefined,
    };
  } catch {
    return {};
  }
}

function publish() {
  performanceStore.setStartup({
    ...readPlatformMarkers(),
    ...readNativeMarkers(),
    jsBundleEval: JS_BUNDLE_EVAL_MS,
    initCalled: initCalledMs,
    firstRender: firstRenderMs,
  });
}

export function readStartupTiming() {
  initCalledMs ??= Date.now();
  publish();
}

/**
 * Called from `DevtoolsOverlay`'s first mount. It's the closest thing this package can observe to the
 * app's first render — the overlay mounts with the app's tree — and it's the only endpoint that makes
 * the total a duration a user would recognise.
 */
export function markFirstRender() {
  if (firstRenderMs !== undefined) return;
  firstRenderMs = Date.now();
  publish();
}
