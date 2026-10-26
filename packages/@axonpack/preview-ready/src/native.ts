import { requireOptionalNativeModule } from "expo";

export type NativeState = {
  bundle?: string | null;
  broken?: string[];
  /** The chosen local Metro server's bundle URL (debug builds only). */
  localServer?: string | null;
};

type NativeModule = {
  select(bundle: string | null, key: string | null): void;
  reload(): void;
  markLaunched(): void;
  selectLocalServer(url: string | null, hostPort: string | null): void;
  state(): NativeState;
};

/** Undefined where the module isn't linked (Expo Go, web), and the package then does nothing. */
export const nativeModule = (): NativeModule | undefined =>
  requireOptionalNativeModule<NativeModule>("AxonpackPreviewReady") ??
  undefined;

/** The id of the preview the next start loads, from `<id>/<platform>/<bundle>`. */
export const selectedPreviewId = (state: NativeState): string | null =>
  state.bundle ? state.bundle.split("/")[0] : null;

/**
 * Tells the native side this start worked. Until it is called, a crash makes the next launch fall
 * back to the base bundle and mark the preview broken. The provider calls it once mounted.
 */
export function markLaunched(): void {
  nativeModule()?.markLaunched();
}
