import { requireOptionalNativeModule } from 'expo';

import { performanceStore, type StartupTiming } from '../../stores/performance/performance.store';

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

export function markFirstRender() {
  if (firstRenderMs !== undefined) return;
  firstRenderMs = Date.now();
  publish();
}
