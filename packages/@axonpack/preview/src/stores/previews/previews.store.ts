import { useSyncExternalStore } from "react";

import {
  PreviewConfig,
  currentPlatform,
  previewsConfigured,
  resolveBuildKey,
} from "../../utils/config/config.util";
import type { IndexEntry } from "../../utils/previews/layout.util";
import { downloadPreview } from "../../services/previews/download.service";
import {
  LocalPreview,
  deleteLocalPreview,
  listLocalPreviews,
} from "../../services/previews/local-previews.service";
import {
  nativeModule,
  scriptUrl,
  selectedPreviewId,
} from "../../services/native/native.service";
import { runningPreviewId } from "../../utils/previews/running.util";
import { previewBundlePath } from "../../services/previews/select.service";
import { fetchPreviews } from "../../services/previews/remote.service";

export type PreviewsState = {
  loading: boolean;
  error: string | null;
  /** This build's key; downloads made for any other are incompatible. */
  buildKey: string | null;
  /** What the bucket lists for this build. Null until it has answered once. */
  remote: IndexEntry[] | null;
  local: LocalPreview[];
  /** Download progress by id, from 0 to 1. */
  downloading: Record<string, number>;
  /** The preview the next start loads, or null for the default bundle. */
  activeId: string | null;
  /**
   * The preview that runs now, or null. Not `activeId` when the chosen one did not load: a dev
   * preview server runs instead, or it fell back to the default bundle.
   */
  runningId: string | null;
  /** Previews that stopped before they finished starting, so the default bundle loaded instead. */
  broken: string[];
};

let state: PreviewsState = {
  loading: false,
  error: null,
  buildKey: null,
  remote: null,
  local: [],
  downloading: {},
  activeId: null,
  runningId: null,
  broken: [],
};
const listeners = new Set<() => void>();

const set = (patch: Partial<PreviewsState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const readLocal = async () => {
  const platform = currentPlatform();
  const nativeState = nativeModule()?.state() ?? {};
  const activeId = selectedPreviewId(nativeState);
  set({
    local: platform ? await listLocalPreviews(platform) : [],
    activeId,
    runningId: runningPreviewId({
      activeId,
      loaded: nativeState.loaded,
      scriptUrl: scriptUrl(),
    }),
    broken: nativeState.broken ?? [],
  });
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const previewsStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Reads the downloads on the device, then asks the bucket for this build's list. With no bucket
   * URL set it asks nothing, and the list says previews are not set up.
   */
  async refresh(config: PreviewConfig) {
    set({
      loading: true,
      error: null,
      buildKey: resolveBuildKey(config),
    });
    try {
      await readLocal();
      const index = previewsConfigured(config)
        ? await fetchPreviews(config)
        : null;
      set({ remote: index?.previews ?? null, loading: false });
    } catch (error) {
      set({ loading: false, error: message(error) });
    }
  },

  async download(config: PreviewConfig, id: string) {
    const entry = state.remote?.find((p) => p.id === id);
    if (!entry || id in state.downloading) return;
    set({ downloading: { ...state.downloading, [id]: 0 }, error: null });
    try {
      await downloadPreview(config, entry, ({ bytes, totalBytes }) =>
        set({
          downloading: {
            ...state.downloading,
            [id]: totalBytes ? bytes / totalBytes : 0,
          },
        }),
      );
    } catch (error) {
      set({ error: message(error) });
    } finally {
      const { [id]: _, ...rest } = state.downloading;
      set({ downloading: rest });
      await readLocal();
    }
  },

  /**
   * Restarts into a preview, downloading it first when it is not on the device, or into the
   * default bundle with null. A preview with an update keeps its downloaded copy until QA updates it.
   */
  async switchTo(config: PreviewConfig, id: string | null) {
    const native = nativeModule();
    const platform = currentPlatform();
    if (!native || !platform) return;
    set({ error: null });
    if (
      id !== null &&
      !state.local.some((p) => p.id === id && p.key === state.buildKey)
    ) {
      await previewsStore.download(config, id);
      if (!state.local.some((p) => p.id === id)) return;
    }
    const local = state.local.find((p) => p.id === id);
    // A native side older than this JS (an app not rebuilt since the package changed) throws here.
    // The list shows the reason instead of the button silently doing nothing.
    try {
      // Native loads a picked server before any preview, so a server left picked would keep
      // running instead of the preview or the default bundle chosen here.
      if (typeof native.selectLocalServer === "function") {
        native.selectLocalServer(null, null);
      }
      native.select(
        id === null ? null : previewBundlePath(id),
        local?.key ?? null,
      );
      native.reload();
    } catch (error) {
      set({ error: message(error) });
    }
  },

  /** Deletes a download. If it is the one running, the app goes back to the default bundle first. */
  async remove(id: string) {
    const platform = currentPlatform();
    if (!platform) return;
    const native = nativeModule();
    set({ error: null });
    try {
      if (state.activeId === id && native) {
        native.select(null, null);
        native.reload();
      }
      deleteLocalPreview(id, platform);
    } catch (error) {
      set({ error: message(error) });
    }
    await readLocal();
  },

  clearError: () => set({ error: null }),

  /** Deletes every download made for another native build. */
  async removeIncompatible() {
    for (const preview of state.local) {
      if (preview.key !== state.buildKey)
        await previewsStore.remove(preview.id);
    }
  },
};

export const usePreviewsState = () =>
  useSyncExternalStore(previewsStore.subscribe, previewsStore.getState);
