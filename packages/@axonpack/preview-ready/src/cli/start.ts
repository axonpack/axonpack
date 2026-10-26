import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";

import { PLATFORMS, compatibilityKey, type Platform } from "../core/layout";
import { HEARTBEAT_MS, type RegisteredServer } from "../core/local-servers";
import { previewTitle } from "../preview-title";
import { type AppConfig, appVersionOf, compatibilityOf } from "./expo-config";
import { fingerprint } from "./project";

const log = (message: string) =>
  process.stdout.write(`preview-ready: ${message}\n`);

const portIsFree = (port: number) =>
  new Promise<boolean>((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port);
  });

/**
 * The first port in the range nothing listens on and no other `start` has claimed. A claim counts
 * because Metro takes a few seconds to bind, and two starts close together would pick the same port.
 */
export async function freePort(
  [from, to]: [number, number],
  claimed: Set<number> = new Set(),
): Promise<number> {
  for (let port = from; port <= to; port++) {
    if (claimed.has(port)) continue;
    if (await portIsFree(port)) return port;
  }
  throw new Error(
    `No free port between ${from} and ${to}; pass --ports <from>-<to>.`,
  );
}

/** What the registry is told; the keys are made the way `publish` makes them. */
export function registration(input: {
  config: AppConfig & {
    slug?: string;
    name?: string;
    ios?: { bundleIdentifier?: string };
    android?: { package?: string };
  };
  port: number;
  branch: string;
  worktree: string;
  fingerprints?: Partial<Record<Platform, string>>;
}): RegisteredServer {
  const { config } = input;
  const compatibility = compatibilityOf(config);
  const keys: Partial<Record<Platform, string>> = {};
  for (const platform of PLATFORMS) {
    const value =
      compatibility === "appVersion"
        ? appVersionOf(config, platform)
        : input.fingerprints?.[platform];
    if (value) keys[platform] = compatibilityKey(compatibility, value);
  }
  return {
    id: `${input.port}-${randomUUID().slice(0, 8)}`,
    port: input.port,
    title: input.branch ? previewTitle(input.branch) : (config.name ?? ""),
    branch: input.branch,
    worktree: input.worktree,
    slug: config.slug ?? "",
    name: config.name ?? "",
    iosBundleIdentifier: config.ios?.bundleIdentifier,
    androidPackage: config.android?.package,
    compatibility,
    keys,
    startedAt: new Date().toISOString(),
  };
}

const registryUp = async (registry: string) => {
  try {
    return (
      await fetch(`${registry}/servers`, { signal: AbortSignal.timeout(500) })
    ).ok;
  } catch {
    return false;
  }
};

/** Starts the registry in the background when none answers, and waits for it. */
async function ensureRegistry(registryPort: number, bin: string) {
  const registry = `http://127.0.0.1:${registryPort}`;
  if (await registryUp(registry)) return registry;
  spawn(process.execPath, [bin, "registry", "--port", String(registryPort)], {
    detached: true,
    stdio: "ignore",
  }).unref();
  for (let i = 0; i < 30; i++) {
    if (await registryUp(registry)) return registry;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`The registry did not start on port ${registryPort}.`);
}

/** Forwards the ports to every attached Android device, when adb is there; quiet otherwise. */
function adbReverse(ports: number[]) {
  let devices: string[];
  try {
    devices = execFileSync("adb", ["devices"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .slice(1)
      .filter((line) => line.endsWith("\tdevice"))
      .map((line) => line.split("\t")[0]);
  } catch {
    return;
  }
  for (const serial of devices) {
    for (const port of ports) {
      try {
        execFileSync(
          "adb",
          ["-s", serial, "reverse", `tcp:${port}`, `tcp:${port}`],
          { stdio: "ignore" },
        );
      } catch {
        // A device going away mid-loop is not an error worth stopping Metro for.
      }
    }
  }
}

export type StartOptions = {
  projectRoot: string;
  config: AppConfig & { slug?: string; name?: string };
  branch: string;
  worktree: string;
  ports: [number, number];
  registryPort: number;
  expoArgs: string[];
  bin: string;
};

/**
 * Runs `expo start` on a free port and announces it, so the app's list shows it. The announcement
 * goes when Metro stops: on exit, on Ctrl+C, and through the registry's heartbeat timeout when the
 * process is killed outright.
 */
export async function start(options: StartOptions) {
  const registry = await ensureRegistry(options.registryPort, options.bin);
  const claimed = await fetch(`${registry}/servers`)
    .then((res) => res.json() as Promise<{ servers: RegisteredServer[] }>)
    .then(({ servers }) => new Set(servers.map((s) => s.port)))
    .catch(() => new Set<number>());
  const port = await freePort(options.ports, claimed);
  const fingerprints: Partial<Record<Platform, string>> = {};
  if (compatibilityOf(options.config) === "fingerprint") {
    for (const platform of PLATFORMS) {
      fingerprints[platform] = await fingerprint(options.projectRoot, platform);
    }
  }
  const server = registration({ ...options, port, fingerprints });
  adbReverse([options.registryPort, port]);

  const post = () =>
    fetch(`${registry}/servers`, {
      method: "POST",
      body: JSON.stringify(server),
    });
  // The registry exits once it has been empty for a while, which a slow start (adb, fingerprint)
  // can outlast, and it may be killed: start it again and register in that case.
  const register = () =>
    post()
      .catch(() => ensureRegistry(options.registryPort, options.bin).then(post))
      .catch(() => {
        // Still down; the next heartbeat tries again.
      });
  const unregister = () =>
    fetch(`${registry}/servers/${encodeURIComponent(server.id)}`, {
      method: "DELETE",
    }).catch(() => undefined);

  await register();
  log(
    `${server.title || server.name} on port ${port}, announced on ${registry}`,
  );
  let beats = 0;
  const heartbeat = setInterval(() => {
    register();
    // A restarted emulator forgets its reverse rules; renew them now and then.
    if (++beats % 6 === 0) adbReverse([options.registryPort, port]);
  }, HEARTBEAT_MS);

  const child = spawn(
    "npx",
    ["expo", "start", "--port", String(port), ...options.expoArgs],
    {
      cwd: options.projectRoot,
      stdio: "inherit",
    },
  );
  let stopping = false;
  const stop = async (code: number) => {
    if (stopping) return;
    stopping = true;
    clearInterval(heartbeat);
    await unregister();
    process.exit(code);
  };
  child.on("exit", (code) => stop(code ?? 0));
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(signal, () => {
      child.kill(signal);
      stop(0);
    });
  }
}
