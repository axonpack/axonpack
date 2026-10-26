import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

type NativeModule = { select(bundle: string | null, key: string | null): void };

// What `expo export:embed` names the bundle on each platform, so a preview folder holds exactly
// what the native build would embed.
const BUNDLE_FILE = Platform.select({
  ios: "main.jsbundle",
  default: "index.android.bundle",
});

/** Where a preview's bundle sits, relative to the preview folder. */
export const previewBundlePath = (id: string): string =>
  `${id}/${Platform.OS}/${BUNDLE_FILE}`;

/**
 * Chooses what the next start or `reload()` loads: a preview by id, or null for the base bundle.
 * `key` is the build key the preview was published for; with it, a later build with another key
 * loads the base bundle instead.
 * A preview that is not on the device falls back to the base bundle. False where the native module
 * isn't linked.
 */
export function selectPreview(id: string | null, key?: string): boolean {
  const native = requireOptionalNativeModule<NativeModule>(
    "AxonpackPreviewReady",
  );
  if (!native) return false;
  native.select(
    id === null ? null : previewBundlePath(id),
    id === null ? null : (key ?? null),
  );
  return true;
}
