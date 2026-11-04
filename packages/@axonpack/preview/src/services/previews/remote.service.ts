import {
  Manifest,
  PlatformIndex,
  compatibilityOfKey,
  platformIndexKey,
} from "../../utils/previews/layout.util";
import { S3Config, getJson } from "../s3/s3.service";
import {
  PreviewConfig,
  currentPlatform,
  resolveBuildKey,
  resolveSlug,
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
  // Without it the app can't tell its own folder from other apps' in a shared bucket.
  if (!resolveSlug(config)) {
    throw new PreviewError(
      'This build has no app slug. Add "@axonpack/preview" to the app config plugins and rebuild, or pass `slug`.',
    );
  }
  const s3 = toS3Config(config);
  const indexKey = platformIndexKey(platform, key);
  const found = await getJson<PlatformIndex>(s3, indexKey);
  // 0.1.0 published outside the slug folder. Its previews show until the first publish under the
  // slug gives this build a list there. A read key limited to the slug folder gets a 403 there,
  // which only means there is nothing old to show.
  const old = found
    ? null
    : await getJson<PlatformIndex>({ ...s3, slug: undefined }, indexKey).catch(
        () => null,
      );
  if (old) {
    return {
      ...old.data,
      previews: old.data.previews.map((p) => ({ ...p, withoutSlug: true })),
    };
  }
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
  s3: S3Config,
  key: string,
): Promise<Manifest> {
  const found = await getJson<Manifest>(s3, key);
  if (!found) throw new PreviewError(`The preview's manifest ${key} is gone.`);
  return found.data;
}
