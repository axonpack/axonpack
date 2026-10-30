import { Platform as RNPlatform } from "react-native";

import type { Platform } from "../../utils/previews/layout.util";
import {
  DEFAULT_PORT_RANGE,
  DEFAULT_REGISTRY_PORT,
  type RegisteredServer,
} from "../../constants/dev-preview-servers/dev-preview-servers.const";
import type { HostAddress } from "../../utils/dev-preview-servers/hosts.util";
import type {
  RemoteRegistry,
  ScannedServer,
} from "../../utils/dev-preview-servers/merge-servers.util";
import { sameServer } from "../../utils/previews/running.util";

// Generous on purpose. Android's HTTP client runs 5 requests per host at a time, so most of the
// 19 probes wait in its queue, and the emulator's NAT takes about 400 ms even to refuse a closed
// port. A tighter limit dropped live servers on the emulator. A closed port on a real computer
// still fails at once, so a round only gets slow on a host that drops packets.
const PROBE_MS = 2000;

/**
 * Runs one request, body read included, and aborts it after `ms`. The timer is cleared once the
 * request settles, so a fast answer leaves nothing pending: a full sweep sends 20 of these.
 */
async function within<T>(
  ms: number,
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function isMetro(hostPort: string): Promise<boolean> {
  try {
    const text = await within(PROBE_MS, async (signal) =>
      (await fetch(`http://${hostPort}/status`, { signal })).text(),
    );
    return text.includes("packager-status:running");
  } catch {
    return false;
  }
}

/** The Expo manifest a dev server gives for this platform: its bundle URL and app config. */
async function readManifest(host: string, port: number, platform: Platform) {
  const manifest = await within(3000, async (signal) =>
    (
      await fetch(`http://${host}:${port}/`, {
        headers: { "expo-platform": platform, accept: "application/json" },
        signal,
      })
    ).json(),
  );
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
    const body = await within(PROBE_MS, async (signal) =>
      (await fetch(`http://${host}:${port}/servers`, { signal })).json(),
    );
    // A host typed by hand may run something else on the port.
    const { servers } = body as { servers?: unknown };
    return Array.isArray(servers) ? (servers as RegisteredServer[]) : null;
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
export function candidateHosts(): string[] {
  const hosts = [devServerHost()];
  if (RNPlatform.OS === "android") hosts.push("10.0.2.2");
  return [...new Set(hosts)];
}

/**
 * The names this computer always goes by, which the list shows as checked, plus the computer the
 * app's Metro is on. They are one machine, so the scan asks only `candidateHosts()`.
 */
export const builtInHosts = (): string[] => [
  ...new Set([
    "localhost",
    "127.0.0.1",
    ...(RNPlatform.OS === "android" ? ["10.0.2.2"] : []),
    devServerHost(),
  ]),
];

const manifests = new Map<
  string,
  Promise<Awaited<ReturnType<typeof readManifest>> | null>
>();

async function localRegistry(hosts: string[]) {
  for (const host of hosts) {
    const registry = await readRegistry(host, DEFAULT_REGISTRY_PORT);
    if (registry) return { registry, registryHost: host };
  }
  return { registry: [], registryHost: null };
}

/**
 * One look: every Metro in the range on the candidate hosts, plus the registry and the host it
 * answered on. `ports` narrows the range to those ports (the registry's are always asked). `own`
 * is the `host:port` the app runs from, asked directly. `remote` are other computers, asked only
 * for the servers their registry lists. `alive` is every `host:port` that answered.
 */
export async function discover(
  platform: Platform,
  own: string | null = null,
  ports: number[] | null = null,
  remote: HostAddress[] = [],
): Promise<{
  registry: RegisteredServer[];
  registryHost: string | null;
  remote: RemoteRegistry[];
  scanned: ScannedServer[];
  alive: string[];
}> {
  const [from, to] = DEFAULT_PORT_RANGE;
  const hosts = candidateHosts();
  // Another computer is never scanned, so a plain `expo start` there never shows. One the app's
  // Metro is on is scanned already.
  const others = remote.filter((r) => !hosts.includes(r.host));
  const [{ registry, registryHost }, registries] = await Promise.all([
    localRegistry(hosts),
    Promise.all(
      others.map(async ({ host, port }) => ({
        host,
        servers: (await readRegistry(host, port)) ?? [],
      })),
    ),
  ]);
  const asked = new Set<number>(registry.map((r) => r.port));
  if (ports) ports.forEach((port) => asked.add(port));
  else for (let port = from; port <= to; port++) asked.add(port);
  const listed = registries.flatMap(({ host, servers }) =>
    servers.map(({ port }) => ({ host, port })),
  );
  // When the scan already asks the server the app runs from, asking it again only adds one more
  // refused connection for iOS to log while it is down.
  const ownAsked =
    own !== null &&
    ([...asked].some((port) =>
      hosts.some((host) => sameServer(`${host}:${port}`, own)),
    ) ||
      listed.some(({ host, port }) => sameServer(`${host}:${port}`, own)));

  const alive: string[] = [];
  const answers = async (host: string, port: number) => {
    const id = `${host}:${port}`;
    if (await isMetro(id)) {
      alive.push(id);
      return true;
    }
    // A closed port drops its manifest, so a new server there is read fresh.
    manifests.delete(id);
    return false;
  };
  const [found, foundElsewhere] = await Promise.all([
    Promise.all(
      [...asked].map(async (port) => {
        for (const host of hosts)
          if (await answers(host, port)) return { host, port };
        return null;
      }),
    ),
    Promise.all(
      listed.map(async ({ host, port }) =>
        (await answers(host, port)) ? { host, port } : null,
      ),
    ),
    // The server the app runs from can be on a host or port the scan does not cover.
    own &&
      !ownAsked &&
      isMetro(own).then((up) => {
        if (up) alive.push(own);
      }),
  ]);
  // In the order asked, not the order answered, so two servers on one port keep their places.
  const scanned = await Promise.all(
    [...found, ...foundElsewhere].map(async (hit) => {
      if (!hit) return null;
      const id = `${hit.host}:${hit.port}`;
      // Read once per server.
      if (!manifests.has(id))
        manifests.set(
          id,
          readManifest(hit.host, hit.port, platform).catch(() => null),
        );
      const manifest = await manifests.get(id);
      return manifest?.url ? { ...hit, ...manifest } : null;
    }),
  );
  return {
    registry,
    registryHost,
    remote: registries,
    scanned: scanned.filter((s): s is ScannedServer => s !== null),
    alive,
  };
}
