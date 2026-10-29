import { Platform as RNPlatform } from "react-native";

import type { Platform } from "../../utils/previews/layout.util";
import {
  DEFAULT_PORT_RANGE,
  DEFAULT_REGISTRY_PORT,
  type RegisteredServer,
} from "../../constants/dev-preview-servers/dev-preview-servers.const";
import type { ScannedServer } from "../../utils/dev-preview-servers/merge-servers.util";

// Generous on purpose. Android's HTTP client runs 5 requests per host at a time, so most of the
// 19 probes wait in its queue, and the emulator's NAT takes about 400 ms even to refuse a closed
// port. A tighter limit dropped live servers on the emulator. A closed port on a real computer
// still fails at once, so a round only gets slow on a host that drops packets.
const PROBE_MS = 2000;

/**
 * Runs one request, body read included, and aborts it after `ms`. The timer is cleared once the
 * request settles, so a fast answer leaves nothing pending: a poll round sends 20 of these.
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

async function isMetro(host: string, port: number): Promise<boolean> {
  try {
    const text = await within(PROBE_MS, async (signal) =>
      (await fetch(`http://${host}:${port}/status`, { signal })).text(),
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
    return (body as { servers: RegisteredServer[] }).servers;
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

const manifests = new Map<
  string,
  Promise<Awaited<ReturnType<typeof readManifest>> | null>
>();

/** One look: every Metro in the range on the candidate hosts, plus the registry. */
export async function discover(
  platform: Platform,
): Promise<{ registry: RegisteredServer[]; scanned: ScannedServer[] }> {
  const [from, to] = DEFAULT_PORT_RANGE;
  const hosts = candidateHosts();
  let registry: RegisteredServer[] = [];
  for (const host of hosts) {
    const found = await readRegistry(host, DEFAULT_REGISTRY_PORT);
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
