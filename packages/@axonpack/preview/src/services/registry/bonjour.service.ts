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
 * and one that went or changed gets a goodbye.
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

  // Port 5353 is shared with the system's own responder; `reuseAddr` is what lets both bind it.
  let bound = false;
  let queue = new Promise<void>((resolve) => {
    socket.on("error", () => {
      // After the bind, a send failed: a network went away, or macOS refused local network
      // access. The next one may work. Before it, the bind failed, and Bonjour stays off: the
      // registry still works without it.
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
          await new Promise<void>((done) =>
            socket.send(packet, MDNS_PORT, MDNS_GROUP, () => done()),
          );
        }
      }
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
