import { requireOptionalNativeModule } from "expo";

export type NativeState = { bundle?: string | null; broken?: string[] };

type NativeModule = {
  fingerprint?: string | null;
  select(bundle: string | null): void;
  reload(): void;
  state(): NativeState;
};

/** Undefined where the module isn't linked (Expo Go, web), and the package then does nothing. */
export const nativeModule = (): NativeModule | undefined =>
  requireOptionalNativeModule<NativeModule>("AxonpackPreviewReady") ??
  undefined;

/** The id of the preview the next start loads, from `<id>/<platform>/<bundle>`. */
export const selectedPreviewId = (state: NativeState): string | null =>
  state.bundle ? state.bundle.split("/")[0] : null;
