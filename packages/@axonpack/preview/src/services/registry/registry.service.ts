import { createServer, type IncomingMessage, type Server } from "node:http";

import {
  type Machine,
  type RegisteredServer,
  type RegistryAnswer,
  REGISTRY_VERSION,
  SERVER_TTL_MS,
} from "../../constants/dev-preview-servers/dev-preview-servers.const";

type Entry = { server: RegisteredServer; lastSeen: number };

/** The registry's memory: servers by id, each dropped once it misses its heartbeats. */
export class ServerList {
  private entries = new Map<string, Entry>();

  constructor(private readonly ttlMs = SERVER_TTL_MS) {}

  upsert(server: RegisteredServer, now: number) {
    this.entries.set(server.id, { server, lastSeen: now });
  }

  remove(id: string) {
    this.entries.delete(id);
  }

  /** The live servers, after dropping the ones whose heartbeat stopped. */
  alive(now: number): RegisteredServer[] {
    for (const [id, entry] of this.entries) {
      if (now - entry.lastSeen > this.ttlMs) this.entries.delete(id);
    }
    return [...this.entries.values()]
      .map((e) => e.server)
      .sort((a, b) => a.port - b.port);
  }
}

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

/**
 * `GET /servers` lists the live servers, with this registry's version, this computer's id and LAN
 * addresses, and why Bonjour announcing fails, if it does; `POST /servers` registers one or renews
 * its heartbeat, and answers the same; `DELETE /servers/<id>` removes one. Plain HTTP, so the app
 * reads it with `fetch` and `curl` shows it too. Once it has been empty for `idleExitMs`, `onIdle`
 * is called. `onChange` gets the live list after every change and once a second, which is when a
 * server whose heartbeat stopped is dropped.
 */
export function createRegistry(
  options: {
    ttlMs?: number;
    idleExitMs?: number;
    onIdle?: () => void;
    onChange?: (servers: RegisteredServer[]) => void;
    machine?: Machine;
    announceError?: () => string | undefined;
    now?: () => number;
  } = {},
): { server: Server; list: ServerList } {
  const now = options.now ?? Date.now;
  const list = new ServerList(options.ttlMs);
  let emptySince = now();

  const server = createServer(async (req, res) => {
    const send = (status: number, body?: unknown) => {
      res.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };
    const answer = (): RegistryAnswer => ({
      servers: list.alive(now()),
      version: REGISTRY_VERSION,
      machineId: options.machine?.id,
      addresses: options.machine?.addresses,
      announceError: options.announceError?.(),
    });
    try {
      if (req.method === "GET" && req.url === "/servers") {
        send(200, answer());
      } else if (req.method === "POST" && req.url === "/servers") {
        const entry = JSON.parse(await readBody(req)) as RegisteredServer;
        if (typeof entry.id !== "string" || typeof entry.port !== "number") {
          send(400, { error: "id and port are required" });
          return;
        }
        list.upsert(entry, now());
        // The heartbeat's answer is how `preview start` hears that announcing fails. One from an
        // older version ignores the body.
        send(200, answer());
        options.onChange?.(list.alive(now()));
      } else if (req.method === "DELETE" && req.url?.startsWith("/servers/")) {
        list.remove(decodeURIComponent(req.url.slice("/servers/".length)));
        send(204);
        options.onChange?.(list.alive(now()));
      } else {
        send(404, { error: "not found" });
      }
    } catch (error) {
      send(400, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  if (options.onIdle || options.onChange) {
    const timer = setInterval(() => {
      const alive = list.alive(now());
      options.onChange?.(alive);
      if (alive.length > 0) emptySince = now();
      else if (now() - emptySince > (options.idleExitMs ?? 30000))
        options.onIdle?.();
    }, 1000);
    timer.unref();
    server.on("close", () => clearInterval(timer));
  }
  return { server, list };
}
