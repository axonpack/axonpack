import { useSyncExternalStore } from "react";

import { buildKey, buildSlug } from "../../services/native/build-info.service";
import { currentPlatform } from "../../utils/config/config.util";
import { discover } from "../../services/dev-preview-servers/discover.service";
import {
  type DevPreviewServer,
  mergeServers,
} from "../../utils/dev-preview-servers/merge-servers.util";
import { nativeModule, scriptUrl } from "../../services/native/native.service";
import {
  readRunningServer,
  saveRunningServer,
} from "../../services/dev-preview-servers/running-server.service";
import { hostPortOf, sameServer } from "../../utils/previews/running.util";

export type DevPreviewServersState = {
  /**
   * This app's servers. The one the app runs from stays when a look misses it, as it was last
   * seen answering (saved, so a reload still knows it), or marked `unknown` if it never was.
   */
  servers: DevPreviewServer[];
  /** The bundle URL of the dev preview server the next start uses, or null. */
  activeUrl: string | null;
  /**
   * `host:port` of every Metro that answered in the last round, the one the app runs from
   * included wherever it is. Null until a round has finished since the list opened.
   */
  alive: string[] | null;
  error: string | null;
};

let state: DevPreviewServersState = {
  servers: [],
  activeUrl: null,
  alive: null,
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

/** The server at `own` as saved before a reload, or marked unknown when nothing was. */
async function savedOrUnknown(
  own: string,
  url: string,
  appSlug: string,
): Promise<DevPreviewServer> {
  const saved = await readRunningServer();
  if (saved && sameServer(saved.hostPort, own)) return saved;
  const at = own.lastIndexOf(":");
  return {
    hostPort: own,
    host: own.slice(0, at),
    port: Number(own.slice(at + 1)),
    url,
    title: "",
    name: "",
    slug: appSlug,
    version: null,
    branch: null,
    worktree: null,
    key: null,
    // It runs here, so it was made for this build.
    compatible: true,
    announced: false,
    unknown: true,
  };
}

async function poll() {
  const platform = currentPlatform();
  const appSlug = buildSlug();
  // A round can outlast the interval on a slow host; overlapping rounds would land out of order.
  if (!platform || !appSlug || polling) return;
  polling = true;
  try {
    // The Metro the app's JS came from; null for a preview or a bundle built into the app.
    const url = scriptUrl();
    const own = url ? hostPortOf(url) : null;
    const found = await discover(platform, own);
    let servers = mergeServers({
      ...found,
      appSlug,
      buildKey: buildKey(),
      platform,
    });
    if (url && own) {
      const seen = servers.find((s) => sameServer(s.hostPort, own));
      const last = state.servers.find((s) => sameServer(s.hostPort, own));
      if (seen && JSON.stringify(seen) !== JSON.stringify(last))
        saveRunningServer(seen);
      if (!seen)
        servers = [
          ...servers,
          last ?? (await savedOrUnknown(own, url, appSlug)),
        ].sort((a, b) => a.port - b.port);
    }
    set({
      servers,
      activeUrl: nativeModule()?.state().localServer ?? null,
      alive: found.alive,
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
      // A round from an earlier visit may be old. Until this visit's first one, it is not known.
      set({ alive: null });
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
