import {
  Manifest,
  PlatformIndex,
  compatibilityOfKey,
  platformIndexKey,
} from "./core/layout";
import { getJson } from "./core/s3";
import {
  PreviewReadyConfig,
  currentPlatform,
  resolveBuildKey,
  toS3Config,
} from "./config";

export class PreviewReadyError extends Error {}

/**
 * The previews published for this exact native build. An empty list when nothing has been
 * published for it yet. Throws when the build cannot be identified or the bucket says no.
 */
export async function fetchPreviews(
  config: PreviewReadyConfig,
): Promise<PlatformIndex> {
  const platform = currentPlatform();
  const key = resolveBuildKey(config);
  if (!platform)
    throw new PreviewReadyError("Previews run on Android and iOS only.");
  if (!key) {
    throw new PreviewReadyError(
      'This build has no compatibility key. Add "@axonpack/preview-ready" to the app config plugins and rebuild, or pass `buildKey`.',
    );
  }
  const found = await getJson<PlatformIndex>(
    toS3Config(config),
    platformIndexKey(platform, key),
  );
  return (
    found?.data ?? {
      schema: 1,
      platform,
      key,
      compatibility: compatibilityOfKey(key),
      updatedAt: "",
      previews: [],
    }
  );
}

export async function fetchManifest(
  config: PreviewReadyConfig,
  key: string,
): Promise<Manifest> {
  const found = await getJson<Manifest>(toS3Config(config), key);
  if (!found)
    throw new PreviewReadyError(`The preview's manifest ${key} is gone.`);
  return found.data;
}
