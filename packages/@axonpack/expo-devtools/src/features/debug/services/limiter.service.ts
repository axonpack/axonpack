import { requireOptionalNativeModule } from 'expo';

import { LIMITER_CRASH_MESSAGE, type LimiterTarget } from '../constants/limiter.const';

type LimiterNativeModule = {
  blockMainThread: (durationMs: number) => void;
  crashMainThread: (message: string) => void;
};

const native = requireOptionalNativeModule<LimiterNativeModule>('AxonpackDevtools');

export function isMainThreadLimiterAvailable(): boolean {
  return native != null;
}

export function blockJsThread(durationMs: number) {
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {}
}

export function blockMainThread(durationMs: number) {
  native?.blockMainThread(durationMs);
}

export function crashJsThread(message: string) {
  throw new Error(message);
}

export function crashMainThread(message: string) {
  native?.crashMainThread(message);
}

export function blockThread(target: LimiterTarget, durationMs: number) {
  if (target === 'main') blockMainThread(durationMs);
  else blockJsThread(durationMs);
}

export function crashThread(target: LimiterTarget) {
  if (target === 'main') crashMainThread(`${LIMITER_CRASH_MESSAGE} (main thread)`);
  else crashJsThread(`${LIMITER_CRASH_MESSAGE} (JS thread)`);
}
