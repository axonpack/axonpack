import { Directory, File } from "expo-file-system";

import { IndexEntry, fileKey } from "../../utils/previews/layout.util";
import { s3Fetch } from "../s3/s3.service";
import { sha256Hex } from "../../utils/s3/sigv4.util";
import {
  PreviewConfig,
  currentPlatform,
  toS3Config,
} from "../../utils/config/config.util";
import {
  LocalPreview,
  previewDirectory,
  rootDirectory,
  writeLocalPreview,
} from "./local-previews.service";
import { PreviewError, fetchManifest } from "./remote.service";

export type DownloadProgress = { bytes: number; totalBytes: number };

/**
 * Downloads a preview into `preview/<id>/<platform>/`. Files go into a hidden folder first
 * and every one is checked against its sha256; only a complete, checked folder is renamed into
 * place. So an interrupted or corrupt download never looks like a preview.
 */
export async function downloadPreview(
  config: PreviewConfig,
  entry: IndexEntry,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<LocalPreview> {
  const platform = currentPlatform();
  if (!platform)
    throw new PreviewError("Previews run on Android and iOS only.");
  const s3 = toS3Config(config);
  const manifest = await fetchManifest(config, entry.manifest);
  const totalBytes = manifest.files.reduce((sum, f) => sum + f.size, 0);

  const parent = new Directory(rootDirectory(), entry.id);
  const partial = new Directory(parent, `.${platform}-partial`);
  if (partial.exists) partial.delete();
  partial.create({ intermediates: true });

  try {
    let bytes = 0;
    onProgress?.({ bytes, totalBytes });
    for (const file of manifest.files) {
      const res = await s3Fetch(s3, {
        method: "GET",
        key: fileKey(file.sha256),
      });
      if (!res.ok)
        throw new PreviewError(
          `Download of ${file.path} failed (${res.status}).`,
        );
      const data = new Uint8Array(await res.arrayBuffer());
      if (sha256Hex(data) !== file.sha256) {
        throw new PreviewError(`${file.path} did not match its checksum.`);
      }
      const target = new File(partial, ...file.path.split("/"));
      target.create({ intermediates: true, overwrite: true });
      await target.write(data);
      bytes += file.size;
      onProgress?.({ bytes, totalBytes });
    }
    const destination = previewDirectory(entry.id, platform);
    if (destination.exists) destination.delete();
    partial.rename(platform);
  } catch (error) {
    if (partial.exists) partial.delete();
    throw error;
  }

  const local: LocalPreview = {
    id: entry.id,
    platform,
    key: manifest.key,
    revision: entry.revision,
    downloadedAt: new Date().toISOString(),
    entry,
  };
  await writeLocalPreview(local);
  return local;
}
