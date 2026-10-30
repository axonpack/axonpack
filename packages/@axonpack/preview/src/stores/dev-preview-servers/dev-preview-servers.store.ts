import { useSyncExternalStore } from "react";
import { AppState, type NativeEventSubscription } from "react-native";

import { buildKey, buildSlug } from "../../services/native/build-info.service";
import {
  type DevServersSetup,
  currentPlatform,
} from "../../utils/config/config.util";
import {
  builtInHosts,
  discover,
} from "../../services/dev-preview-servers/discover.service";
import {
  readHosts,
  saveHosts,
} from "../../services/dev-preview-servers/hosts.service";
import { DEFAULT_REGISTRY_PORT } from "../../constants/dev-preview-servers/dev-preview-servers.const";
import type {
  DevServerHost,
  HostAddress,
  HostProblem,
} from "../../utils/dev-preview-servers/hosts.util";
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
import type { BonjourService } from "../../utils/dev-preview-servers/bonjour.util";

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
  /** A full sweep of the port range runs now. The quick look every 2 s does not count. */
  scanning: boolean;
  /**
   * Where the list looks: this computer under its usual names, the app's hosts, and the ones
   * added on the device. Empty until the first look.
   */
  hosts: DevServerHost[];
};

let state: DevPreviewServersState = {
  servers: [],
  activeUrl: null,
  alive: null,
  error: null,
  scanning: false,
  hosts: [],
};
const listeners = new Set<() => void>();
const set = (patch: Partial<DevPreviewServersState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const POLL_MS = 2000;
// Each closed port in the range is a refused connection, and iOS logs every one to the Xcode
// console, which JS can't silence. So between full sweeps a poll asks only the servers already
// known, and a new plain `expo start` server waits at most this long to show.
const SWEEP_MS = 30000;
let watchers = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let appState: NativeEventSubscription | null = null;

let round: { sweep: boolean; done: Promise<void> } | null = null;
let lastSweep = 0;
/** Ports that answered in the last round. Quick polls keep asking them until they stop. */
let known: number[] = [];

let setup: Pick<DevServersSetup, "hosts" | "allowCustomHosts"> = {
  hosts: [],
  allowCustomHosts: false,
};
/** The hosts added on the device, read from its file on each mount. */
let userHosts: HostAddress[] = [];
let userHostsRead: Promise<void> | null = null;

/** What Bonjour found on the network, while it browses. The next look picks it up. */
let bonjour: BonjourService[] = [];
let browsing: { remove(): void } | null = null;

/** Bonjour runs while the list watches and the app is in the foreground. */
function browse(on: boolean) {
  const native = nativeModule();
  if (!native?.startBonjourBrowse) return;
  if (on && !browsing) {
    browsing = native.addListener("onBonjourServices", (event) => {
      bonjour = event.services;
    });
    native.startBonjourBrowse();
  } else if (!on && browsing) {
    browsing.remove();
    browsing = null;
    bonjour = [];
    native.stopBonjourBrowse?.();
  }
}

const sameAddress = (a: HostAddress, b: HostAddress) =>
  a.host === b.host && a.port === b.port;

function updateHosts() {
  const user = setup.allowCustomHosts
    ? userHosts.filter((u) => !setup.hosts.some((a) => sameAddress(a, u)))
    : [];
  set({
    hosts: [
      ...builtInHosts().map((host) => ({
        host,
        port: DEFAULT_REGISTRY_PORT,
        source: "built-in" as const,
      })),
      ...setup.hosts.map((h) => ({ ...h, source: "app" as const })),
      ...user.map((h) => ({ ...h, source: "user" as const })),
    ],
  });
}

function readUserHosts(): Promise<void> {
  if (!userHostsRead)
    userHostsRead = readHosts().then((found) => {
      userHosts = found;
      updateHosts();
    });
  return userHostsRead;
}

const SKIPPED: Record<HostProblem, string> = {
  invalid: "it is not an IP address or a host name",
  duplicate: "it is listed twice",
  builtIn: "it is always checked",
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const portOf = (hostPort: string) =>
  Number(hostPort.slice(hostPort.lastIndexOf(":") + 1));

/** The server at `own` as saved before a reload, or marked unknown when nothing was. */
async function savedOrUnknown(
  own: string,
  url: string,
  appSlug: string,
): Promise<DevPreviewServer> {
  const saved = await readRunningServer();
  if (saved && sameServer(saved.hostPort, own)) return saved;
  return {
    hostPort: own,
    host: own.slice(0, own.lastIndexOf(":")),
    port: portOf(own),
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

/** One round: the whole port range on a sweep, else the registry and the servers already known. */
async function poll(sweep: boolean) {
  const platform = currentPlatform();
  const appSlug = buildSlug();
  if (!platform || !appSlug) return;
  if (sweep) {
    lastSweep = Date.now();
    set({ scanning: true });
  }
  try {
    await readUserHosts();
    const remote = state.hosts.filter((h) => h.source !== "built-in");
    // The Metro the app's JS came from; null for a preview or a bundle built into the app.
    const url = scriptUrl();
    const own = url ? hostPortOf(url) : null;
    const defaultMetro = nativeModule()?.state().defaultServer;
    const found = await discover(
      platform,
      own,
      sweep
        ? null
        : [...known, ...(defaultMetro ? [portOf(defaultMetro)] : [])],
      remote,
      bonjour,
      appSlug,
    );
    // Another computer's ports are asked through its registry, never scanned here.
    known = found.alive
      .filter((id) => !found.remote.some((r) => id.startsWith(`${r.host}:`)))
      .map(portOf);
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
      scanning: false,
    });
  } catch (error) {
    set({ error: message(error), scanning: false });
  }
}

/**
 * Rounds never overlap: one can outlast the interval on a slow host, and overlapping rounds would
 * land out of order. A sweep asked for during a quick round runs once that round ends.
 */
function look(sweep: boolean): Promise<void> {
  if (round)
    return sweep && !round.sweep
      ? round.done.then(() => look(true))
      : round.done;
  const done = poll(sweep).finally(() => {
    round = null;
  });
  round = { sweep, done };
  return done;
}

function tick() {
  if (AppState.currentState === "background") return;
  look(Date.now() - lastSweep >= SWEEP_MS);
}

export const devPreviewServersStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * The app's own hosts and whether hosts may be added on the device, from its config. Set it
   * before `watch()`, which looks at once. Entries that are not hosts are skipped with a warning.
   */
  configure(
    next: Pick<DevServersSetup, "hosts" | "allowCustomHosts" | "skipped">,
  ) {
    for (const { text, problem } of next.skipped)
      console.warn(
        `@axonpack/preview: devPreviewServers.hosts skips "${text}": ${SKIPPED[problem]}.`,
      );
    setup = next;
    updateHosts();
  },

  /**
   * While something watches (the list is on screen): sweeps the port range at once and every 30 s,
   * asks the servers already known every 2 s, and browses Bonjour for `preview start` servers on
   * the network. Nothing while the app is in the background. Debug builds only; returns a function
   * that stops watching.
   */
  watch(): () => void {
    if (!__DEV__) return () => undefined;
    watchers++;
    if (!timer) {
      // A round from an earlier visit may be old. Until this visit's first one, it is not known.
      set({ alive: null });
      userHostsRead = null;
      look(true);
      browse(true);
      timer = setInterval(tick, POLL_MS);
      appState = AppState.addEventListener("change", (next) => {
        if (next === "active") {
          browse(true);
          look(false);
        } else if (next === "background") browse(false);
      });
    }
    return () => {
      watchers--;
      if (watchers === 0 && timer) {
        clearInterval(timer);
        timer = null;
        appState?.remove();
        appState = null;
        browse(false);
      }
    };
  },

  /** Sweeps the whole port range, as pull to refresh and the Refresh button ask. */
  refresh: () => look(true),

  /** Adds a host on this device, saves it, and looks for its servers. */
  async addHost(address: HostAddress) {
    await readUserHosts();
    if (userHosts.some((h) => sameAddress(h, address))) return;
    userHosts = [...userHosts, address];
    updateHosts();
    await saveHosts(userHosts);
    // A full look, which also asks a registry that did not answer before it was removed.
    await look(true);
  },

  /** Removes a host added on this device. Its servers leave the list on the next look. */
  async removeHost(address: HostAddress) {
    await readUserHosts();
    userHosts = userHosts.filter((h) => !sameAddress(h, address));
    updateHosts();
    await saveHosts(userHosts);
    await look(false);
  },

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
