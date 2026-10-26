import { Manifest, PlatformIndex, platformIndexKey } from "./core/layout";
import { getJson } from "./core/s3";
import {
  PreviewReadyConfig,
  currentPlatform,
  resolveFingerprint,
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
  const fingerprint = resolveFingerprint(config);
  if (!platform)
    throw new PreviewReadyError("Previews run on Android and iOS only.");
  if (!fingerprint) {
    throw new PreviewReadyError(
      'This build has no fingerprint. Add "@axonpack/preview-ready" to the app config plugins and rebuild, or pass `fingerprint`.',
    );
  }
  const found = await getJson<PlatformIndex>(
    toS3Config(config),
    platformIndexKey(platform, fingerprint),
  );
  return (
    found?.data ?? {
      schema: 1,
      platform,
      fingerprint,
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
