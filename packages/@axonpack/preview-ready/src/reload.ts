import { requireOptionalNativeModule } from "expo";

type NativeModule = { reload(): void };

/**
 * Restarts JS. The native side picks the bundle again on the way up, so this is how a new choice
 * of preview takes effect. False where the module isn't linked (Expo Go, web, iOS for now).
 */
export function reload(): boolean {
  const native = requireOptionalNativeModule<NativeModule>(
    "AxonpackPreviewReady",
  );
  if (!native) return false;
  native.reload();
  return true;
}
