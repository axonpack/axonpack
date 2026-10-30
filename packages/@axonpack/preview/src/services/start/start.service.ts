import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { get } from "node:http";
import { createServer } from "node:net";

import {
  PLATFORMS,
  compatibilityKey,
  type Platform,
} from "../../utils/previews/layout.util";
import {
  HEARTBEAT_MS,
  REGISTRY_VERSION,
  type RegisteredServer,
  type RegistryAnswer,
} from "../../constants/dev-preview-servers/dev-preview-servers.const";
import { previewTitle } from "../../utils/previews/preview-title.util";
import {
  type AppConfig,
  appVersionOf,
  compatibilityOf,
} from "../../utils/config/expo-config.util";
import { fingerprint } from "../cli/project.service";

const log = (message: string) => process.stdout.write(`preview: ${message}\n`);

const portIsFree = (port: number) =>
  new Promise<boolean>((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port);
  });

/** The first port in the range nothing listens on and no other `start` has announced. */
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

const samePath = (a: string, b: string) => {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return a === b;
  }
};

/** Whether the Metro on `port` serves `projectRoot`, by the header Expo's `/status` sends. */
const servesProject = (port: number, projectRoot: string) =>
  new Promise<boolean>((resolve) => {
    const req = get(
      { host: "127.0.0.1", port, path: "/status", timeout: 500 },
      (res) => {
        res.resume();
        const root = res.headers["x-react-native-project-root"];
        resolve(
          typeof root === "string" && samePath(decodeURI(root), projectRoot),
        );
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
  });

/**
 * The port this project's Metro answers on, or null until it does. Usually the one it was given,
 * but Expo moves to another when it finds that one taken (it asks, and yes is the default).
 */
export async function metroPort(
  projectRoot: string,
  given: number,
  [from, to]: [number, number],
): Promise<number | null> {
  if (await servesProject(given, projectRoot)) return given;
  for (let port = from; port <= to; port++) {
    if (port !== given && (await servesProject(port, projectRoot))) return port;
  }
  return null;
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
  /** What the app's list shows. Default: the branch's readable title, or the app's name. */
  title?: string;
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
    title:
      input.title ||
      (input.branch ? previewTitle(input.branch) : (config.name ?? "")),
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** What the registry answers on `/servers`, or null when none does. */
async function registryAnswer(registry: string) {
  try {
    const res = await fetch(`${registry}/servers`, {
      signal: AbortSignal.timeout(500),
    });
    return res.ok ? ((await res.json()) as RegistryAnswer) : null;
  } catch {
    return null;
  }
}

/** A registry that sends no version is older than any that does. */
export const olderRegistry = (answer: RegistryAnswer) =>
  (answer.version ?? 0) < REGISTRY_VERSION;

/** Whether `command` runs this package's CLI as a registry, the way `ensureRegistry` starts one. */
function isPreviewRegistry(command: string) {
  const script = / (\S+) registry --port \d+$/.exec(command)?.[1];
  try {
    return !!script && /@axonpack[/\\]preview[/\\]/.test(realpathSync(script));
  } catch {
    return false;
  }
}

/** The pid and command line of what listens on `port`, or null where lsof or ps is missing. */
function listener(port: number) {
  const run = (cmd: string, args: string[]) =>
    execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  try {
    const pid = Number(
      run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]).split(
        "\n",
      )[0],
    );
    return pid
      ? {
          pid,
          command: run("ps", ["-ww", "-o", "command=", "-p", String(pid)]),
        }
      : null;
  } catch {
    return null;
  }
}

const waitForFreePort = async (port: number, ms: number) => {
  for (let waited = 0; waited < ms; waited += 100) {
    if (await portIsFree(port)) return true;
    await sleep(100);
  }
  return false;
};

/**
 * Stops the registry on `port` with SIGTERM, and SIGKILL when that is not enough, once its command
 * line shows it is one, and returns its pid once the port is free. Anything else on the port is left
 * alone, with a line saying what it is.
 */
async function stopRegistry(port: number, what: string) {
  const found = listener(port);
  const again = "and run preview start again.";
  if (!found) {
    log(
      `${what} is on port ${port}, and lsof can't say which process it is. Stop it ${again}` +
        (process.platform === "win32"
          ? ` netstat -ano | findstr :${port} shows its pid.`
          : ""),
    );
    return null;
  }
  if (!isPreviewRegistry(found.command)) {
    log(
      `Port ${port} is held by pid ${found.pid} (${found.command}), which isn't a preview registry, so it was left running. Stop it with kill ${found.pid} ${again}`,
    );
    return null;
  }
  try {
    process.kill(found.pid, "SIGTERM");
    if (await waitForFreePort(port, 3000)) return found.pid;
    // Hung, so its own SIGTERM handler never ran.
    process.kill(found.pid, "SIGKILL");
    if (await waitForFreePort(port, 1000)) return found.pid;
  } catch {
    // Gone in the meantime, or another user's.
    if (await portIsFree(port)) return found.pid;
  }
  log(
    `${what} (pid ${found.pid}) didn't stop. Stop it with kill -9 ${found.pid} ${again}`,
  );
  return null;
}

const metroAnswers = (port: number) =>
  fetch(`http://127.0.0.1:${port}/status`, {
    signal: AbortSignal.timeout(500),
  }).then(
    (res) => res.ok,
    () => false,
  );

/**
 * Starts the registry in the background when none answers, and waits for it. One that is older
 * than this version, or holds the port but doesn't answer, is replaced first. The older one's
 * servers whose Metro still answers are handed over, so none drops out of the list or the Bonjour
 * announcements. A newer or equal one is used as it is.
 */
export async function ensureRegistry(
  registryPort: number,
  bin: string,
  retry = true,
): Promise<string> {
  const registry = `http://127.0.0.1:${registryPort}`;
  const running = await registryAnswer(registry);
  if (running && !olderRegistry(running)) return registry;
  // Nothing answers but the port is taken: a registry that hung, or something else.
  const hung = !running && !(await portIsFree(registryPort));
  let replaced: number | null = null;
  if (running) {
    replaced = await stopRegistry(registryPort, "An older preview registry");
    // Then the older one stays, which still works on this computer and over USB.
    if (!replaced) return registry;
  } else if (hung) {
    replaced = await stopRegistry(
      registryPort,
      "Something that doesn't answer like a preview registry",
    );
    if (!replaced)
      throw new Error(
        `The registry can't start while port ${registryPort} is taken.`,
      );
  }
  spawn(process.execPath, [bin, "registry", "--port", String(registryPort)], {
    detached: true,
    stdio: "ignore",
  }).unref();
  for (let i = 0; i < 30; i++) {
    const answer = await registryAnswer(registry);
    if (!answer) {
      await sleep(100);
      continue;
    }
    if (!replaced) return registry;
    // An older `preview start` whose heartbeat failed in the gap starts its own older registry,
    // and may get the port first.
    if (olderRegistry(answer))
      return retry ? ensureRegistry(registryPort, bin, false) : registry;
    // A server whose Metro is gone would be announced until its heartbeat TTL ran out.
    await Promise.all(
      (running?.servers ?? []).map(async (server) => {
        if (!(await metroAnswers(server.port))) return;
        await fetch(`${registry}/servers`, {
          method: "POST",
          body: JSON.stringify(server),
        }).catch(() => undefined);
      }),
    );
    log(
      running
        ? `Replaced an older preview registry (pid ${replaced}), so this computer can be found on the network.`
        : `Replaced a preview registry that had stopped answering (pid ${replaced}).`,
    );
    return registry;
  }
  throw new Error(`The registry did not start on port ${registryPort}.`);
}

/** Says once why phones on the network can't find this computer, with the fix on macOS. */
export function announceErrorNotice() {
  let shown: string | undefined;
  return (error: string | undefined) => {
    if (error && error !== shown)
      log(
        `Phones on the network can't find this computer (${error}).` +
          // What macOS answers a send with when the terminal app has no local network access.
          (process.platform === "darwin" && /EHOSTUNREACH|EPERM/.test(error)
            ? " Allow your terminal app under System Settings > Privacy & Security > Local Network."
            : ""),
      );
    shown = error;
  };
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
  title?: string;
  ports: [number, number];
  registryPort: number;
  expoArgs: string[];
  bin: string;
};

/**
 * Runs `expo start` on a free port and announces it, so the app's list shows it. It is announced
 * once Metro answers, on the port Metro really took, since the app gives the announced title and
 * kind to whatever answers there. The announcement goes when Metro stops: on exit, on Ctrl+C, and
 * through the registry's heartbeat timeout when the process is killed outright.
 */
export async function start(options: StartOptions) {
  const registry = await ensureRegistry(options.registryPort, options.bin);
  const claimed = await fetch(`${registry}/servers`)
    .then((res) => res.json() as Promise<{ servers: RegisteredServer[] }>)
    .then(({ servers }) => new Set(servers.map((s) => s.port)))
    .catch(() => new Set<number>());
  const port = await freePort(options.ports, claimed);
  // Maybe left by a `preview start` that crashed, maybe the user's own `expo start`, so it is never
  // stopped. A free port does the job.
  const wanted = options.ports[0];
  if (port !== wanted && !claimed.has(wanted) && (await metroAnswers(wanted)))
    log(
      `Port ${wanted} has a Metro that no preview start announced (your own expo start, or one left from an earlier run), so this one uses port ${port}.`,
    );
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
  const notice = announceErrorNotice();
  // The registry exits once it has been empty for a while, which a slow start (adb, fingerprint)
  // can outlast, and it may be killed: start it again and register in that case.
  const register = () =>
    post()
      .catch(() => ensureRegistry(options.registryPort, options.bin).then(post))
      .then((res) => res.json() as Promise<RegistryAnswer>)
      .then((answer) => notice(answer.announceError))
      .catch(() => {
        // Still down, and the next heartbeat tries again. Or an older registry, which answers
        // with no body.
      });
  const unregister = () =>
    fetch(`${registry}/servers/${encodeURIComponent(server.id)}`, {
      method: "DELETE",
    }).catch(() => undefined);

  let announced = false;
  const announce = async () => {
    const real = await metroPort(
      options.projectRoot,
      server.port,
      options.ports,
    );
    if (real === null) return;
    if (real !== server.port) {
      server.port = real;
      adbReverse([real]);
    }
    const first = !announced;
    announced = true;
    if (first)
      log(
        `${server.title || server.name} on port ${real}, announced on ${registry}`,
      );
    await register();
  };
  let ticks = 0;
  const heartbeat = setInterval(() => {
    ticks++;
    // Every second until Metro answers, then a heartbeat.
    if (!announced || ticks % (HEARTBEAT_MS / 1000) === 0) announce();
    // A restarted emulator forgets its reverse rules; renew them now and then.
    if (ticks % 30 === 0) adbReverse([options.registryPort, server.port]);
  }, 1000);

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
      // Unannounced only once Metro is gone (the exit above), or the app's last look sees it
      // still answering with no announcement, as a plain Expo server.
      setTimeout(() => stop(0), 5000);
    });
  }
}
