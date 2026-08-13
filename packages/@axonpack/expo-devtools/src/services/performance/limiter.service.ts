import { requireOptionalNativeModule } from 'expo';

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
