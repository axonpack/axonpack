import { useSyncExternalStore } from "react";

import { buildKey, buildSlug } from "../../../core/services/build-info.service";
import { currentPlatform } from "../../../core/utils/config.util";
import { discover } from "../services/discover.service";
import {
  type DevPreviewServer,
  mergeServers,
} from "../utils/merge-servers.util";
import { nativeModule } from "../../../core/services/native.service";

export type DevPreviewServersState = {
  servers: DevPreviewServer[];
  /** The bundle URL of the dev preview server the next start uses, or null. */
  activeUrl: string | null;
  error: string | null;
};

let state: DevPreviewServersState = {
  servers: [],
  activeUrl: null,
  error: null,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<DevPreviewServersState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const POLL_MS = 2000;
let watchers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

let polling = false;

async function poll() {
  const platform = currentPlatform();
  const appSlug = buildSlug();
  // A round can outlast the interval on a slow host; overlapping rounds would land out of order.
  if (!platform || !appSlug || polling) return;
  polling = true;
  try {
    const found = await discover(platform);
    set({
      servers: mergeServers({
        ...found,
        appSlug,
        buildKey: buildKey(),
        platform,
      }),
      activeUrl: nativeModule()?.state().localServer ?? null,
      error: null,
    });
  } catch (error) {
    set({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    polling = false;
  }
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const devPreviewServersStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Looks every 2 s while something watches (the list is on screen), and stops when nothing does.
   * Debug builds only; returns a function that stops watching.
   */
  watch(): () => void {
    if (!__DEV__) return () => undefined;
    watchers++;
    if (!timer) {
      poll();
      timer = setInterval(poll, POLL_MS);
    }
    return () => {
      watchers--;
      if (watchers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  },

  refresh: () => poll(),

  /** Restarts the app on a dev preview server, or back on what it ran before with null. */
  switchTo(server: DevPreviewServer | null) {
    const native = nativeModule();
    if (!native) return;
    try {
      native.selectLocalServer(server?.url ?? null, server?.hostPort ?? null);
      native.reload();
    } catch (error) {
      set({ error: message(error) });
    }
  },
};

export const useDevPreviewServersState = () =>
  useSyncExternalStore(
    devPreviewServersStore.subscribe,
    devPreviewServersStore.getState,
  );
