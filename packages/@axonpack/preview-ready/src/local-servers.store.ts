import { useSyncExternalStore } from "react";

import { buildKey, buildSlug } from "./build-info";
import { currentPlatform } from "./config";
import {
  type LocalServer,
  type LocalServersOptions,
  discover,
  mergeServers,
} from "./local-servers";
import { nativeModule } from "./native";

export type LocalServersState = {
  servers: LocalServer[];
  /** The bundle URL of the local server the next start uses, or null. */
  activeUrl: string | null;
  error: string | null;
};

let state: LocalServersState = { servers: [], activeUrl: null, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<LocalServersState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const POLL_MS = 2000;
let watchers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

async function poll(options: LocalServersOptions) {
  const platform = currentPlatform();
  if (!platform) return;
  try {
    const found = await discover(options, platform);
    set({
      servers: mergeServers({
        ...found,
        appSlug: options.slug ?? buildSlug(),
        buildKey: buildKey(),
        platform,
      }),
      activeUrl: nativeModule()?.state().localServer ?? null,
      error: null,
    });
  } catch (error) {
    set({ error: error instanceof Error ? error.message : String(error) });
  }
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const localServersStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Looks every 2 s while something watches (the list is on screen), and stops when nothing does.
   * Debug builds only; returns a function that stops watching.
   */
  watch(options: LocalServersOptions): () => void {
    if (!__DEV__ || !options.enabled) return () => undefined;
    watchers++;
    if (!timer) {
      poll(options);
      timer = setInterval(() => poll(options), POLL_MS);
    }
    return () => {
      watchers--;
      if (watchers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  },

  refresh: (options: LocalServersOptions) => poll(options),

  /** Restarts the app on a local server, or back on what it ran before with null. */
  switchTo(server: LocalServer | null) {
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

export const useLocalServersState = () =>
  useSyncExternalStore(localServersStore.subscribe, localServersStore.getState);
