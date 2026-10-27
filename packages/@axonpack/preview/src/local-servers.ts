import { Platform as RNPlatform } from "react-native";

import {
  appVersionOf,
  compatibilityOf,
  type AppConfig,
} from "./cli/expo-config";
import { compatibilityKey, type Platform } from "./core/layout";
import {
  DEFAULT_PORT_RANGE,
  DEFAULT_REGISTRY_PORT,
  type RegisteredServer,
} from "./core/local-servers";

/** A Metro server on the developer's computer that this app can run from (debug builds only). */
export type LocalServer = {
  /** `host:port`, also what Android's dev support connects to. */
  hostPort: string;
  host: string;
  port: number;
  /** The bundle URL the server's manifest gives for this platform; what iOS loads. */
  url: string;
  title: string;
  name: string;
  slug: string;
  version: string | null;
  branch: string | null;
  worktree: string | null;
  /** The native build key the server's code is for; null when it cannot be told. */
  key: string | null;
  /** Whether `key` matches the installed build: true, false, or null for "unknown". */
  compatible: boolean | null;
  /** Announced by `preview start` (with branch and worktree), or only found by the scan. */
  announced: boolean;
};

export type LocalServersOptions = {
  enabled: boolean;
  /** Ports probed for plain `expo start` servers. Default 8081 to 8099. */
  ports?: [number, number];
  /** Where `preview start` announces servers. Default 19150. */
  registryPort?: number;
  /** The computer's address as the device sees it. Default: the host the app's Metro is on. */
  host?: string;
  /** Only servers for this slug are listed. Default: the slug baked into the build. */
  slug?: string;
};

export type ScannedServer = {
  host: string;
  port: number;
  url: string;
  expo: AppConfig & { slug?: string; name?: string };
};

/**
 * Turns what the registry announced and what the scan found into this app's list: other apps'
 * servers (another slug) are left out, the same app with another native key is kept but marked
 * incompatible, and a server found both ways uses the registry's details.
 */
export function mergeServers(input: {
  registry: RegisteredServer[];
  scanned: ScannedServer[];
  appSlug: string | null;
  buildKey: string | null;
  platform: Platform;
}): LocalServer[] {
  const servers: LocalServer[] = [];
  for (const found of input.scanned) {
    const announced = input.registry.find((r) => r.port === found.port);
    const slug = announced?.slug ?? found.expo.slug ?? "";
    if (input.appSlug && slug !== input.appSlug) continue;
    const key =
      announced?.keys[input.platform] ??
      (compatibilityOf(found.expo) === "appVersion"
        ? compatibilityKey(
            "appVersion",
            appVersionOf(found.expo, input.platform),
          )
        : null);
    servers.push({
      hostPort: `${found.host}:${found.port}`,
      host: found.host,
      port: found.port,
      url: found.url,
      title: announced?.title || found.expo.name || slug,
      name: announced?.name ?? found.expo.name ?? "",
      slug,
      version: appVersionOf(found.expo, input.platform) || null,
      branch: announced?.branch || null,
      worktree: announced?.worktree || null,
      key,
      compatible: key && input.buildKey ? key === input.buildKey : null,
      announced: Boolean(announced),
    });
  }
  return servers.sort((a, b) => a.port - b.port);
}

// Generous on purpose. Android's HTTP client runs 5 requests per host at a time, so most of the
// 19 probes wait in its queue, and the emulator's NAT takes about 400 ms even to refuse a closed
// port. A tighter limit dropped live servers on the emulator. A closed port on a real computer
// still fails at once, so a round only gets slow on a host that drops packets.
const PROBE_MS = 2000;

const timeout = (ms: number) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

async function isMetro(host: string, port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://${host}:${port}/status`, {
      signal: timeout(PROBE_MS),
    });
    return (await res.text()).includes("packager-status:running");
  } catch {
    return false;
  }
}

/** The Expo manifest a dev server gives for this platform: its bundle URL and app config. */
async function readManifest(host: string, port: number, platform: Platform) {
  const res = await fetch(`http://${host}:${port}/`, {
    headers: { "expo-platform": platform, accept: "application/json" },
    signal: timeout(3000),
  });
  const manifest = await res.json();
  return {
    url: String(manifest?.launchAsset?.url ?? ""),
    expo: (manifest?.extra?.expoClient ?? {}) as ScannedServer["expo"],
  };
}

async function readRegistry(
  host: string,
  port: number,
): Promise<RegisteredServer[] | null> {
  try {
    const res = await fetch(`http://${host}:${port}/servers`, {
      signal: timeout(PROBE_MS),
    });
    return ((await res.json()) as { servers: RegisteredServer[] }).servers;
  } catch {
    return null;
  }
}

/** The host the app's own Metro is on, which is where its other servers are too. */
function devServerHost(): string {
  try {
    const getDevServer =
      require("react-native/Libraries/Core/Devtools/getDevServer").default;
    return new URL(getDevServer().url).hostname;
  } catch {
    return "localhost";
  }
}

/**
 * Where to look. On Android, 10.0.2.2 is the computer as the emulator sees it, so plain servers
 * are found there without an `adb reverse` per port.
 */
export function candidateHosts(options: LocalServersOptions): string[] {
  const hosts = [options.host ?? devServerHost()];
  if (RNPlatform.OS === "android" && !options.host) hosts.push("10.0.2.2");
  return [...new Set(hosts)];
}

const manifests = new Map<
  string,
  Promise<Awaited<ReturnType<typeof readManifest>> | null>
>();

/** One look: every Metro in the range on the candidate hosts, plus the registry. */
export async function discover(
  options: LocalServersOptions,
  platform: Platform,
): Promise<{ registry: RegisteredServer[]; scanned: ScannedServer[] }> {
  const [from, to] = options.ports ?? DEFAULT_PORT_RANGE;
  const hosts = candidateHosts(options);
  let registry: RegisteredServer[] = [];
  for (const host of hosts) {
    const found = await readRegistry(
      host,
      options.registryPort ?? DEFAULT_REGISTRY_PORT,
    );
    if (found) {
      registry = found;
      break;
    }
  }
  const ports = new Set<number>(registry.map((r) => r.port));
  for (let port = from; port <= to; port++) ports.add(port);

  const scanned: ScannedServer[] = [];
  await Promise.all(
    [...ports].map(async (port) => {
      for (const host of hosts) {
        if (!(await isMetro(host, port))) continue;
        const id = `${host}:${port}`;
        // Read once per server; a closed port drops its entry so a new server there is read fresh.
        if (!manifests.has(id))
          manifests.set(
            id,
            readManifest(host, port, platform).catch(() => null),
          );
        const manifest = await manifests.get(id);
        if (manifest?.url) scanned.push({ host, port, ...manifest });
        return;
      }
      for (const host of hosts) manifests.delete(`${host}:${port}`);
    }),
  );
  return { registry, scanned };
}
