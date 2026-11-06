import { Directory, File } from "expo-file-system";

import {
  IndexEntry,
  ManifestFile,
  fileKey,
} from "../../utils/previews/layout.util";
import { S3Config, s3Fetch } from "../s3/s3.service";
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
import { runPostDownload } from "./preview-files.service";

export type DownloadProgress = { bytes: number; totalBytes: number };

// A web export can be hundreds of small files, where one request at a time is mostly waiting.
const DOWNLOADS_AT_ONCE = 4;

async function downloadFile(
  s3: S3Config,
  folder: Directory,
  file: ManifestFile,
): Promise<void> {
  const res = await s3Fetch(s3, { method: "GET", key: fileKey(file.sha256) });
  if (!res.ok)
    throw new PreviewError(`Download of ${file.path} failed (${res.status}).`);
  const data = new Uint8Array(await res.arrayBuffer());
  if (sha256Hex(data) !== file.sha256) {
    throw new PreviewError(`${file.path} did not match its checksum.`);
  }
  const target = new File(folder, ...file.path.split("/"));
  target.create({ intermediates: true, overwrite: true });
  await target.write(data);
}

/**
 * Downloads a preview into `preview/<id>/<platform>/`, four files at a time. Files go into a
 * hidden folder first and every one is checked against its sha256; only a complete, checked folder
 * is renamed into place. So an interrupted or corrupt download never looks like a preview. Its file
 * sets come along under `files/<name>/`, then each set's `onPostDownload` runs.
 */
export async function downloadPreview(
  config: PreviewConfig,
  entry: IndexEntry,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<LocalPreview> {
  const platform = currentPlatform();
  if (!platform)
    throw new PreviewError("Previews run on Android and iOS only.");
  const scoped = toS3Config(config);
  // A preview 0.1.0 published has its manifest and files outside the slug folder too.
  const s3 = entry.withoutSlug ? { ...scoped, slug: undefined } : scoped;
  const manifest = await fetchManifest(s3, entry.manifest);
  const totalBytes = manifest.files.reduce((sum, f) => sum + f.size, 0);

  const parent = new Directory(rootDirectory(), entry.id);
  const partial = new Directory(parent, `.${platform}-partial`);
  if (partial.exists) partial.delete();
  partial.create({ intermediates: true });

  try {
    let bytes = 0;
    let next = 0;
    const errors: unknown[] = [];
    onProgress?.({ bytes, totalBytes });
    // After a failure no file starts, and the ones on the way are waited for, so none of them
    // writes into the folder after it is deleted below.
    const worker = async () => {
      while (errors.length === 0 && next < manifest.files.length) {
        const file = manifest.files[next++];
        try {
          await downloadFile(s3, partial, file);
          bytes += file.size;
          onProgress?.({ bytes, totalBytes });
        } catch (error) {
          errors.push(error);
        }
      }
    };
    await Promise.all(Array.from({ length: DOWNLOADS_AT_ONCE }, worker));
    if (errors.length > 0) throw errors[0];
    const destination = previewDirectory(entry.id, platform);
    if (destination.exists) destination.delete();
    partial.rename(platform);
  } catch (error) {
    if (partial.exists) partial.delete();
    throw error;
  }
  // After the rename, since a step such as a path rewrite writes the final folder into the files.
  const onPostDownloadUris = await runPostDownload(
    config,
    entry.id,
    platform,
    Object.keys(manifest.fileSets ?? {}),
  );

  const local: LocalPreview = {
    id: entry.id,
    platform,
    key: manifest.key,
    revision: entry.revision,
    downloadedAt: new Date().toISOString(),
    entry,
    onPostDownloadUris,
  };
  await writeLocalPreview(local);
  return local;
}
