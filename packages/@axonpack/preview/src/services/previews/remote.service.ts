import {
  Manifest,
  PlatformIndex,
  compatibilityOfKey,
  platformIndexKey,
} from "../../utils/previews/layout.util";
import { getJson } from "../s3/s3.service";
import {
  PreviewConfig,
  currentPlatform,
  resolveBuildKey,
  toS3Config,
} from "../../utils/config/config.util";

export class PreviewError extends Error {}

/**
 * The previews published for this exact native build. An empty list when nothing has been
 * published for it yet. Throws when the build cannot be identified or the bucket says no.
 */
export async function fetchPreviews(
  config: PreviewConfig,
): Promise<PlatformIndex> {
  const platform = currentPlatform();
  const key = resolveBuildKey(config);
  if (!platform)
    throw new PreviewError("Previews run on Android and iOS only.");
  if (!key) {
    throw new PreviewError(
      'This build has no compatibility key. Add "@axonpack/preview" to the app config plugins and rebuild, or pass `buildKey`.',
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
  config: PreviewConfig,
  key: string,
): Promise<Manifest> {
  const found = await getJson<Manifest>(toS3Config(config), key);
  if (!found) throw new PreviewError(`The preview's manifest ${key} is gone.`);
  return found.data;
}
