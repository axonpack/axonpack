// Just enough multicast DNS (RFC 6762) and DNS-SD (RFC 6763) to announce a few services and answer
// the queries for them. CLI only: it uses Node's Buffer.

import {
  BONJOUR_TYPE,
  type Machine,
  type RegisteredServer,
} from "../../constants/dev-preview-servers/dev-preview-servers.const";
import { txtOf } from "../dev-preview-servers/bonjour.util";

export const MDNS_GROUP = "224.0.0.251";
export const MDNS_PORT = 5353;

/** Two minutes, the RFC's default for records that name a host, so a killed registry ages out fast. */
export const RECORD_TTL = 120;

const A = 1;
const PTR = 12;
const TXT = 16;
const SRV = 33;

const SERVICE = `${BONJOUR_TYPE}.local`;

const string = (text: string) => {
  const bytes = Buffer.from(text);
  return Buffer.concat([Buffer.from([bytes.length]), bytes]);
};

const encodeName = (name: string) =>
  Buffer.concat([...name.split(".").map(string), Buffer.from([0])]);

function record(
  name: string,
  type: number,
  ttl: number,
  data: Buffer,
  unique = true,
) {
  const fields = Buffer.alloc(10);
  fields.writeUInt16BE(type, 0);
  // Class IN. The top bit is cache flush: only this computer has this record, so a cache drops
  // any older copy. A PTR is shared by every server of the type, so it never sets it.
  fields.writeUInt16BE(unique ? 0x8001 : 0x0001, 2);
  fields.writeUInt32BE(ttl, 4);
  fields.writeUInt16BE(data.length, 8);
  return Buffer.concat([encodeName(name), fields, data]);
}

/** Each entry is one string of at most 255 bytes, so a long title is cut. */
export function encodeTxt(entries: Record<string, string>): Buffer {
  const strings = Object.entries(entries)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => {
      let text = `${key}=${value}`;
      while (Buffer.byteLength(text) > 255) text = text.slice(0, -1);
      return string(text);
    });
  // A TXT record with nothing in it still holds one empty string (RFC 6763, 6.1).
  return strings.length ? Buffer.concat(strings) : Buffer.from([0]);
}

/** One name per computer and port, so two computers never claim the same one. */
export const instanceName = (machine: Pick<Machine, "id">, port: number) =>
  `preview-${machine.id}-${port}`;

/** The host name the SRV record points at. Ours alone, so it is safe to answer for it. */
export const hostName = (machine: Pick<Machine, "id">) =>
  `axonpack-${machine.id}.local`;

/**
 * One server as a response packet: its PTR, SRV and TXT records, and the A record of the interface
 * it goes out on. A TTL of 0 is a goodbye. The goodbye leaves the A record out, since this
 * computer's other servers still use it.
 */
export function announcement(input: {
  server: RegisteredServer;
  machine: Machine;
  /** The IPv4 address of the interface this packet goes out on. */
  address: string;
  registryPort: number;
  ttl: number;
}): Buffer {
  const { server, machine, ttl } = input;
  const instance = `${instanceName(machine, server.port)}.${SERVICE}`;
  const host = hostName(machine);
  const srv = Buffer.alloc(6);
  srv.writeUInt16BE(server.port, 4);
  const answers = [
    record(SERVICE, PTR, ttl, encodeName(instance), false),
    record(instance, SRV, ttl, Buffer.concat([srv, encodeName(host)])),
    record(
      instance,
      TXT,
      ttl,
      encodeTxt(txtOf(server, machine, input.registryPort)),
    ),
    ...(ttl > 0
      ? [
          record(
            host,
            A,
            ttl,
            Buffer.from(input.address.split(".").map(Number)),
          ),
        ]
      : []),
  ];
  const header = Buffer.alloc(12);
  // A response, and authoritative. mDNS responses carry no question and an id of 0.
  header.writeUInt16BE(0x8400, 2);
  header.writeUInt16BE(answers.length, 6);
  return Buffer.concat([header, ...answers]);
}

function readName(packet: Buffer, start: number): [string, number] {
  const labels: string[] = [];
  let offset = start;
  let end = -1;
  // A name can end in a pointer to one earlier in the packet (RFC 1035, 4.1.4). The jump count
  // stops a packet whose pointers loop.
  for (let jumps = 0; jumps < 32;) {
    const length = packet[offset];
    if (length === undefined)
      throw new RangeError("The name runs past the packet");
    if (length === 0)
      return [labels.join(".").toLowerCase(), end < 0 ? offset + 1 : end];
    if (length >= 0xc0) {
      if (end < 0) end = offset + 2;
      offset = packet.readUInt16BE(offset) & 0x3fff;
      jumps++;
    } else {
      labels.push(packet.toString("utf8", offset + 1, offset + 1 + length));
      offset += 1 + length;
    }
  }
  throw new RangeError("The name's pointers loop");
}

/** The names a query asks about, lowercased. Empty for a response or a packet that does not parse. */
export function questionNames(packet: Buffer): string[] {
  try {
    if (packet.readUInt16BE(2) & 0x8000) return [];
    const names: string[] = [];
    let offset = 12;
    for (let i = packet.readUInt16BE(4); i > 0; i--) {
      const [name, end] = readName(packet, offset);
      names.push(name);
      // The type and class follow the name.
      offset = end + 4;
    }
    return names;
  } catch {
    return [];
  }
}

/**
 * Whether a query asks about preview's servers: the service type, one of its instances, or the
 * host name. Any record type counts, since answering all of them costs one packet per server.
 */
export const asksForPreview = (names: string[], machine: Pick<Machine, "id">) =>
  names.some(
    (name) =>
      name === SERVICE ||
      name.endsWith(`.${SERVICE}`) ||
      name === hostName(machine),
  );
