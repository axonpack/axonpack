import { useSyncExternalStore } from "react";

import {
  PreviewReadyConfig,
  currentPlatform,
  resolveFingerprint,
} from "./config";
import type { IndexEntry } from "./core/layout";
import { downloadPreview } from "./download";
import { LocalPreview, deleteLocalPreview, listLocalPreviews } from "./local";
import { nativeModule, selectedPreviewId } from "./native";
import { fetchPreviews } from "./remote";

export type PreviewsState = {
  loading: boolean;
  error: string | null;
  /** This build's fingerprint; downloads made for any other are incompatible. */
  fingerprint: string | null;
  /** What the bucket lists for this build. Null until it has answered once. */
  remote: IndexEntry[] | null;
  local: LocalPreview[];
  /** Download progress by id, from 0 to 1. */
  downloading: Record<string, number>;
  /** The preview the next start loads, or null for the base bundle. */
  activeId: string | null;
};

let state: PreviewsState = {
  loading: false,
  error: null,
  fingerprint: null,
  remote: null,
  local: [],
  downloading: {},
  activeId: null,
};
const listeners = new Set<() => void>();

const set = (patch: Partial<PreviewsState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const readLocal = async () => {
  const platform = currentPlatform();
  const native = nativeModule();
  set({
    local: platform ? await listLocalPreviews(platform) : [],
    activeId: native ? selectedPreviewId(native.state()) : null,
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

  /** Reads the downloads on the device, then asks the bucket for this build's list. */
  async refresh(config: PreviewReadyConfig) {
    set({
      loading: true,
      error: null,
      fingerprint: resolveFingerprint(config),
    });
    try {
      await readLocal();
      const index = await fetchPreviews(config);
      set({ remote: index.previews, loading: false });
    } catch (error) {
      set({ loading: false, error: message(error) });
    }
  },

  async download(config: PreviewReadyConfig, id: string) {
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

  /** Deletes a download. If it is the one running, the app goes back to the base bundle first. */
  async remove(id: string) {
    const platform = currentPlatform();
    if (!platform) return;
    const native = nativeModule();
    if (state.activeId === id && native) {
      native.select(null);
      native.reload();
    }
    deleteLocalPreview(id, platform);
    await readLocal();
  },

  /** Deletes every download made for another native build. */
  async removeIncompatible() {
    for (const preview of state.local) {
      if (preview.fingerprint !== state.fingerprint)
        await previewsStore.remove(preview.id);
    }
  },
};

export const usePreviewsState = () =>
  useSyncExternalStore(previewsStore.subscribe, previewsStore.getState);
