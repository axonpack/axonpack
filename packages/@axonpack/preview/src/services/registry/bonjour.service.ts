import { createHash } from "node:crypto";
import { type Socket, createSocket } from "node:dgram";
import { hostname, networkInterfaces } from "node:os";

import type {
  Machine,
  RegisteredServer,
} from "../../constants/dev-preview-servers/dev-preview-servers.const";
import {
  MDNS_GROUP,
  MDNS_PORT,
  RECORD_TTL,
  announcement,
  asksForPreview,
  instanceName,
  questionNames,
} from "../../utils/registry/mdns.util";

/**
 * This computer. The id comes from its name and network cards, so it is the same on every run with
 * no file to keep it in.
 */
export function thisMachine(): Machine {
  const lan = Object.values(networkInterfaces())
    .flatMap((list) => list ?? [])
    .filter((i) => i.family === "IPv4" && !i.internal);
  const name = hostname().split(".")[0];
  return {
    id: createHash("sha256")
      .update([name, ...lan.map((i) => i.mac).sort()].join(","))
      .digest("hex")
      .slice(0, 12),
    name,
    addresses: lan.map((i) => i.address),
  };
}

/**
 * Announces the registry's servers over Bonjour, on every LAN interface, and answers the queries
 * for them. `sync` takes the live list each time it may have changed: a new server is announced,
 * and one that went or changed gets a goodbye. `error` says why announcing gets nowhere, if it
 * doesn't: the registry runs with no terminal, so `preview start` shows it from the registry's
 * answer.
 *
 * The interfaces are read once, when the registry starts. After a network change the
 * announcements go out on the old ones until the registry restarts, which it does once no server is
 * left. Reading `networkInterfaces()` on each sync would fix that if it turns out to matter.
 */
export function advertise(
  machine: Machine,
  registryPort: number,
  socket: Socket = createSocket({ type: "udp4", reuseAddr: true }),
) {
  let shown = new Map<string, RegisteredServer>();
  let closed = false;
  let answering: ReturnType<typeof setTimeout> | null = null;
  let lastAnswer = 0;
  let error: string | undefined;

  // Port 5353 is shared with the system's own responder; `reuseAddr` is what lets both bind it.
  let bound = false;
  let queue = new Promise<void>((resolve) => {
    socket.on("error", (failed) => {
      // Before the bind, the bind failed, and Bonjour stays off: the registry still works without
      // it. After it, the next send may work.
      error = failed.message;
      if (bound) return;
      closed = true;
      resolve();
    });
    socket.bind(MDNS_PORT, () => {
      bound = true;
      socket.setMulticastTTL(255);
      for (const address of machine.addresses) {
        try {
          socket.addMembership(MDNS_GROUP, address);
        } catch {
          // An interface with no multicast, such as some VPNs.
        }
      }
      resolve();
    });
  });

  // One packet per server per interface, each with that interface's own address. The multicast
  // interface is a socket setting, so each send waits for the last before switching it.
  const send = (servers: RegisteredServer[], ttl: number) => {
    queue = queue.then(async () => {
      let sent = false;
      let failed: Error | null = null;
      for (const address of machine.addresses) {
        for (const server of servers) {
          if (closed) return;
          try {
            socket.setMulticastInterface(address);
          } catch {
            continue;
          }
          const packet = announcement({
            server,
            machine,
            address,
            registryPort,
            ttl,
          });
          const result = await new Promise<Error | null>((done) =>
            socket.send(packet, MDNS_PORT, MDNS_GROUP, done),
          );
          if (result) failed = result;
          else sent = true;
        }
      }
      // One interface failing, such as a VPN, is normal. Every send failing is what macOS does
      // without local network access (EHOSTUNREACH or EPERM), or a computer with no network.
      if (sent) error = undefined;
      else if (failed) error = failed.message;
    });
  };

  socket.on("message", (packet: Buffer) => {
    if (answering || shown.size === 0) return;
    if (!asksForPreview(questionNames(packet), machine)) return;
    // A shared record's answer waits 20 to 120 ms, and a record goes out at most once a second
    // (RFC 6762, 6). Queries in the meantime get the same answer.
    const wait = Math.max(
      20 + Math.random() * 100,
      lastAnswer + 1000 - Date.now(),
    );
    answering = setTimeout(() => {
      answering = null;
      lastAnswer = Date.now();
      send([...shown.values()], RECORD_TTL);
    }, wait);
  });

  const same = (a?: RegisteredServer, b?: RegisteredServer) =>
    JSON.stringify(a) === JSON.stringify(b);

  return {
    error: () => error,
    /** Says goodbye for every server still announced, so phones drop them now, then closes. */
    async stop() {
      send([...shown.values()], 0);
      shown = new Map();
      await queue;
      closed = true;
      try {
        socket.close();
      } catch {
        // Never bound.
      }
    },
    sync(servers: RegisteredServer[]) {
      const next = new Map(
        servers.map((s) => [instanceName(machine, s.port), s]),
      );
      const gone = [...shown].filter(([name, s]) => !same(s, next.get(name)));
      const added = [...next].filter(([name, s]) => !same(s, shown.get(name)));
      shown = next;
      if (gone.length)
        send(
          gone.map(([, s]) => s),
          0,
        );
      if (added.length === 0) return;
      send(
        added.map(([, s]) => s),
        RECORD_TTL,
      );
      // Announced twice, a second apart, in case the first is lost (RFC 6762, 8.3).
      setTimeout(() => {
        const still = added.filter(([name, s]) => same(s, shown.get(name)));
        if (still.length)
          send(
            still.map(([, s]) => s),
            RECORD_TTL,
          );
      }, 1000);
    },
  };
}
