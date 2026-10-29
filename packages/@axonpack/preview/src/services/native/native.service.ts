import { requireOptionalNativeModule } from "expo";
import { TurboModuleRegistry } from "react-native";

/** What native started the running JS from, recorded when it picked it. */
export type NativeLoaded =
  | { kind: "preview"; id: string }
  | { kind: "server"; url: string }
  | { kind: "default" };

export type NativeState = {
  bundle?: string | null;
  broken?: string[];
  /** The chosen local Metro server's bundle URL (debug builds only). */
  localServer?: string | null;
  /** `host:port` of the Metro the app starts on with nothing chosen (debug builds only). */
  defaultServer?: string | null;
  /** Missing on a native side built before it was added. */
  loaded?: NativeLoaded | null;
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
  requireOptionalNativeModule<NativeModule>("AxonpackPreview") ?? undefined;

/** The id of the preview the next start loads, from `<id>/<platform>/<bundle>`. */
export const selectedPreviewId = (state: NativeState): string | null =>
  state.bundle ? state.bundle.split("/")[0] : null;

/**
 * Tells the native side this start worked. Until it is called, a crash makes the next launch fall
 * back to the default bundle and mark the preview broken. The provider calls it once mounted.
 */
export function markLaunched(): void {
  nativeModule()?.markLaunched();
}

/**
 * The URL the running JS was loaded from, as React Native reports it: Metro's `http://` bundle URL,
 * or the file of the embedded bundle or a preview. Null where it cannot be read (tests, web).
 */
export function scriptUrl(): string | null {
  // Through the public registry, since a deep import of RN's own spec now logs a warning.
  try {
    const sourceCode = TurboModuleRegistry.get("SourceCode") as {
      getConstants(): { scriptURL?: string | null };
    } | null;
    return sourceCode?.getConstants().scriptURL || null;
  } catch {
    return null;
  }
}
