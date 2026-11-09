import { Directory } from "expo-file-system";

import {
  type PreviewConfig,
  currentPlatform,
} from "../../utils/config/config.util";
import { type Platform, fileSetPath } from "../../utils/previews/layout.util";
import { runningPreviewId } from "../../utils/previews/running.util";
import {
  nativeModule,
  scriptUrl,
  selectedPreviewId,
} from "../native/native.service";
import {
  deleteLocalPreview,
  previewDirectory,
  readLocalPreview,
  writeLocalPreview,
} from "./local-previews.service";

/** Which copy of a file set to use, and where it is. */
export type PreviewFiles = {
  /** The copy's folder, as a `file://` URI that ends in `/`, so a file name can follow it. */
  uri: string;
  /** `preview` when the running preview carries the set, else `default`, the app's own copy. */
  source: "preview" | "default";
  /** The preview whose copy it is; null for the default copy. */
  previewId: string | null;
  /**
   * False while the preview's copy waits for its `onPostDownload` on start, and for the rest of the
   * start once an `onPostDownload` threw there. Always true for the default copy and for a set
   * without `onPostDownload`.
   */
  ready: boolean;
};

const withSlash = (uri: string) => (uri.endsWith("/") ? uri : `${uri}/`);

/** A preview's copy of a set, inside its downloaded folder. */
export const previewFilesDirectory = (
  id: string,
  platform: Platform,
  name: string,
) => new Directory(previewDirectory(id, platform), fileSetPath(name));

/** The URI `onPostDownload` gets and `previewFilesPath` returns for a preview's copy. */
export const previewFilesUri = (id: string, platform: Platform, name: string) =>
  withSlash(previewFilesDirectory(id, platform, name).uri);

const runningId = (platform: Platform | null) => {
  const native = nativeModule()?.state();
  return platform && native
    ? runningPreviewId({
        activeId: selectedPreviewId(native),
        loaded: native.loaded,
        scriptUrl: scriptUrl(),
      })
    : null;
};

/**
 * Runs `onPostDownload` for each named set whose folder is not the one it last ran with (`ran`, by
 * name), and returns the folders it has run with now. If one throws, the download is deleted, since
 * a step that stopped half way may leave the files half changed.
 */
export async function runPostDownload(
  config: PreviewConfig,
  id: string,
  platform: Platform,
  names: string[],
  ran: Record<string, string> = {},
): Promise<Record<string, string>> {
  const now = { ...ran };
  try {
    for (const name of names) {
      const onPostDownload = config.files?.[name]?.onPostDownload;
      const uri = previewFilesUri(id, platform, name);
      if (!onPostDownload || now[name] === uri) continue;
      await onPostDownload(name, uri, { previousUri: now[name] });
      now[name] = uri;
    }
  } catch (error) {
    deleteLocalPreview(id, platform);
    throw error;
  }
  return now;
}

// This start's check of the running preview's copies: true once a set is ready, false when an
// onPostDownload threw. Replaced on every change, never changed in place, so it works as a
// snapshot.
let checked: { id: string; sets: Record<string, boolean> } | null = null;
const listeners = new Set<() => void>();

export const filesCheck = () => checked;

export function subscribeFilesCheck(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Once per start, for the running preview only. On iOS the app's folder can move when the app is
 * updated, and a path an `onPostDownload` wrote into the files then points at the old one. So a
 * set whose `onPostDownload` last ran with another folder runs it again, told the old one. If it
 * throws, the download is deleted and its sets stay not ready until the next start.
 */
export async function checkFilesFolder(config: PreviewConfig): Promise<void> {
  const platform = currentPlatform();
  const id = runningId(platform);
  if (!id || !platform || checked?.id === id) return;
  const names = Object.keys(config.files ?? {}).filter(
    (name) => previewFilesDirectory(id, platform, name).exists,
  );
  const settle = (sets: Record<string, boolean>) => {
    checked = { id, sets };
    listeners.forEach((listener) => listener());
  };
  const all = (ready: boolean) =>
    Object.fromEntries(names.map((name) => [name, ready]));
  settle({});
  try {
    const local = await readLocalPreview(id, platform);
    const ran = await runPostDownload(
      config,
      id,
      platform,
      names,
      local?.onPostDownloadUris,
    );
    if (
      local &&
      names.some((name) => ran[name] !== local.onPostDownloadUris?.[name])
    )
      await writeLocalPreview({ ...local, onPostDownloadUris: ran });
    settle(all(true));
  } catch (error) {
    settle(all(false));
    throw error;
  }
}

/**
 * Where the copy of a file set that goes with the running bundle is: the running preview's own
 * copy when it was published with the set, else the app's default from `config.files`. Throws for
 * a name `config.files` doesn't list. What runs changes only with a restart; `ready` can change
 * once on start, when the set has an `onPostDownload`.
 */
export function previewFilesPath(
  name: string,
  config: PreviewConfig,
): PreviewFiles {
  const set = config.files?.[name];
  if (!set) {
    throw new Error(
      `@axonpack/preview: the preview config has no files.${name}. Add files: { ${name}: { default: "<the folder of the app's own copy>" } }.`,
    );
  }
  const platform = currentPlatform();
  const id = runningId(platform);
  if (id && platform) {
    const state = checked?.id === id ? checked.sets[name] : undefined;
    const preview = {
      uri: previewFilesUri(id, platform, name),
      source: "preview" as const,
      previewId: id,
    };
    // Its onPostDownload threw and the folder is gone, but the bundle that runs is still this
    // preview's.
    if (state === false) return { ...preview, ready: false };
    // The folder is there only once its download was checked and renamed into place.
    if (previewFilesDirectory(id, platform, name).exists)
      return { ...preview, ready: !set.onPostDownload || state === true };
  }
  return {
    uri: withSlash(set.default),
    source: "default",
    previewId: null,
    ready: true,
  };
}
