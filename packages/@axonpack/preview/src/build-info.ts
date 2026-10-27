import { requireOptionalNativeModule } from "expo";

import type { Compatibility } from "./core/layout";

type NativeModule = {
  compatibility?: string | null;
  key?: string | null;
  slug?: string | null;
};

/**
 * The key this native build lists previews under, as the config plugin baked it in at prebuild:
 * `version-<app version>` or `fingerprint-<hash>`. Null without the plugin or the native module.
 */
export function buildKey(): string | null {
  return (
    requireOptionalNativeModule<NativeModule>("AxonpackPreview")?.key ?? null
  );
}

/** The compatibility setting the build was made with, for showing; null without the plugin. */
export function buildCompatibility(): Compatibility | null {
  const value =
    requireOptionalNativeModule<NativeModule>("AxonpackPreview")?.compatibility;
  return value === "appVersion" || value === "fingerprint" ? value : null;
}

/** The app's Expo slug, baked in by the config plugin; it tells this app's local servers apart. */
export function buildSlug(): string | null {
  return (
    requireOptionalNativeModule<NativeModule>("AxonpackPreview")?.slug ?? null
  );
}
