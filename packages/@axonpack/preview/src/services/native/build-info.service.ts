import { requireOptionalNativeModule } from "expo";

import type { Compatibility } from "../../utils/previews/layout.util";

type NativeModule = {
  compatibility?: string | null;
  key?: string | null;
  slug?: string | null;
  appName?: string | null;
  appVersion?: string | null;
  buildNumber?: string | null;
};

export type BuildApp = {
  name: string | null;
  version: string | null;
  buildNumber: string | null;
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

/** The app's Expo slug, baked in by the config plugin; it tells this app's dev preview servers apart. */
export function buildSlug(): string | null {
  return (
    requireOptionalNativeModule<NativeModule>("AxonpackPreview")?.slug ?? null
  );
}

/** The app's name, version and build number as installed; nulls on a native side older than this JS. */
export function buildApp(): BuildApp {
  const native = requireOptionalNativeModule<NativeModule>("AxonpackPreview");
  return {
    name: native?.appName ?? null,
    version: native?.appVersion ?? null,
    buildNumber: native?.buildNumber ?? null,
  };
}
