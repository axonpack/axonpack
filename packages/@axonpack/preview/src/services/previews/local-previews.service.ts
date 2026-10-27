import { Directory, File, Paths } from "expo-file-system";

import type { IndexEntry, Platform } from "../../utils/previews/layout.util";

/**
 * A downloaded preview, as recorded next to its files. It keeps the index entry it was
 * downloaded from, so the list still has a title and changelog after the preview is unpublished.
 */
export type LocalPreview = {
  id: string;
  platform: Platform;
  /** The build key it was published for; it runs only on a build with the same key. */
  key: string;
  revision: string;
  downloadedAt: string;
  entry: IndexEntry;
};

/** The same folder the native side reads: Documents on iOS, the files folder on Android. */
export const rootDirectory = () => new Directory(Paths.document, "preview");

export const previewDirectory = (id: string, platform: Platform) =>
  new Directory(rootDirectory(), id, platform);

const metaFile = (id: string, platform: Platform) =>
  new File(rootDirectory(), id, `${platform}.json`);

export async function writeLocalPreview(preview: LocalPreview): Promise<void> {
  const file = metaFile(preview.id, preview.platform);
  if (!file.exists) file.create({ intermediates: true });
  await file.write(JSON.stringify(preview));
}

export async function readLocalPreview(
  id: string,
  platform: Platform,
): Promise<LocalPreview | null> {
  const file = metaFile(id, platform);
  if (!file.exists || !previewDirectory(id, platform).exists) return null;
  try {
    return JSON.parse(await file.text()) as LocalPreview;
  } catch {
    return null;
  }
}

/** Every downloaded preview for this platform, whatever build it was made for. */
export async function listLocalPreviews(
  platform: Platform,
): Promise<LocalPreview[]> {
  const root = rootDirectory();
  if (!root.exists) return [];
  const previews: LocalPreview[] = [];
  for (const item of root.list()) {
    if (!(item instanceof Directory) || item.name.startsWith(".")) continue;
    const preview = await readLocalPreview(item.name, platform);
    if (preview) previews.push(preview);
  }
  return previews;
}

/** Removes the download's files and its record. The folder for the id goes once it is empty. */
export function deleteLocalPreview(id: string, platform: Platform): void {
  const folder = previewDirectory(id, platform);
  if (folder.exists) folder.delete();
  const meta = metaFile(id, platform);
  if (meta.exists) meta.delete();
  const parent = new Directory(rootDirectory(), id);
  if (parent.exists && parent.list().length === 0) parent.delete();
}
