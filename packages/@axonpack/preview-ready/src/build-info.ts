import { requireOptionalNativeModule } from "expo";

type NativeModule = { fingerprint?: string | null };

/**
 * This native build's fingerprint, as the config plugin baked it in at prebuild. The app only
 * offers previews published for this value. Null without the plugin or the native module.
 */
export function buildFingerprint(): string | null {
  return (
    requireOptionalNativeModule<NativeModule>("AxonpackPreviewReady")
      ?.fingerprint ?? null
  );
}
