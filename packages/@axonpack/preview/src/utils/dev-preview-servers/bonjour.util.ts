import type {
  Machine,
  RegisteredServer,
} from "../../constants/dev-preview-servers/dev-preview-servers.const";
import type { RemoteRegistry } from "./merge-servers.util";

/** A `preview start` server that Bonjour found on the network, as native reports it. */
export type BonjourService = {
  /** The Bonjour instance name, one per computer and port. */
  name: string;
  /** Its IPv4 address. */
  host: string;
  /** The Metro port. */
  port: number;
  txt: Record<string, string>;
};

/** The TXT record the registry announces a server with. The app reads it back with `serverOf`. */
export function txtOf(
  server: RegisteredServer,
  machine: Pick<Machine, "id" | "name">,
  registryPort: number,
): Record<string, string> {
  return {
    title: server.title,
    branch: server.branch,
    slug: server.slug,
    name: server.name,
    compatibility: server.compatibility,
    ...(server.keys.ios ? { ios: server.keys.ios } : {}),
    ...(server.keys.android ? { android: server.keys.android } : {}),
    registry: String(registryPort),
    machineId: machine.id,
    machineName: machine.name,
  };
}

const serverOf = (port: number, txt: Record<string, string>) =>
  ({
    id: `${txt.machineId}-${port}`,
    port,
    title: txt.title ?? "",
    branch: txt.branch ?? "",
    // A path on another computer means nothing here.
    worktree: "",
    slug: txt.slug ?? "",
    name: txt.name ?? "",
    compatibility:
      txt.compatibility === "fingerprint" ? "fingerprint" : "appVersion",
    keys: {
      ...(txt.ios ? { ios: txt.ios } : {}),
      ...(txt.android ? { android: txt.android } : {}),
    },
    startedAt: "",
  }) satisfies RegisteredServer;

/** A computer the look already reaches: a registry that answered, or a host the port scan covers. */
export type KnownMachine = {
  host: string;
  machineId?: string;
  addresses?: string[];
  /**
   * The ports a server answered on there. Unset, it covers every port, which is the guess made
   * before anything is asked.
   */
  ports?: number[];
};

/**
 * The servers Bonjour found that nothing else covers, grouped by computer like a host's registry.
 * Another app's are left out. So is a server on a computer already reached another way: this one
 * (its registry's machine id or one of its addresses, which is how the emulator's 10.0.2.2 and the
 * Mac's LAN address are told to be one machine), and a host typed in whose registry answered. Those
 * come from their registry, which knows more, so one server never shows twice. A known computer's
 * `ports` narrow that to the servers that answered there.
 */
export function bonjourRegistries(input: {
  services: BonjourService[];
  appSlug: string;
  known: KnownMachine[];
}): RemoteRegistry[] {
  const groups = new Map<string, RemoteRegistry>();
  for (const { host, port, txt } of input.services) {
    if (txt.slug !== input.appSlug) continue;
    const reached = input.known.some(
      (k) =>
        ((k.machineId !== undefined && k.machineId === txt.machineId) ||
          k.host === host ||
          k.addresses?.includes(host)) &&
        (k.ports === undefined || k.ports.includes(port)),
    );
    if (reached) continue;
    const group = groups.get(host) ?? {
      host,
      machine: txt.machineName || undefined,
      servers: [],
    };
    group.servers.push(serverOf(port, txt));
    groups.set(host, group);
  }
  return [...groups.values()];
}
