// Shapes and defaults shared by `preview start`, its registry and the app.

import type { Compatibility, Platform } from "../../utils/previews/layout.util";

/** Where the registry listens on the developer's computer. */
export const DEFAULT_REGISTRY_PORT = 19150;

/** Ports `preview start` picks from, and the app probes for plain `expo start` servers. */
export const DEFAULT_PORT_RANGE: [number, number] = [8081, 8099];

/**
 * The Bonjour service type the registry announces `preview start` servers under. A service name
 * takes 15 characters at most (RFC 6335), which is why it is not `_axonpack-preview`.
 */
export const BONJOUR_TYPE = "_axon-preview._tcp";

/** A heartbeat is sent this often, and a server missing for TTL is dropped. */
export const HEARTBEAT_MS = 5000;
export const SERVER_TTL_MS = 15000;

/** What `preview start` tells the registry about the Metro it runs. */
export type RegisteredServer = {
  /** Unique per run, so a restarted server on the same port is a new entry. */
  id: string;
  port: number;
  title: string;
  branch: string;
  worktree: string;
  slug: string;
  name: string;
  iosBundleIdentifier?: string;
  androidPackage?: string;
  compatibility: Compatibility;
  /** The build key per platform, as `publish` would make it. */
  keys: Partial<Record<Platform, string>>;
  startedAt: string;
};

/** The computer the registry runs on. */
export type Machine = {
  /** The same on every run, so the app can tell this computer apart however it reached it. */
  id: string;
  /** The host name, without `.local`. */
  name: string;
  /** Its IPv4 addresses on the local network. */
  addresses: string[];
};

/** What `GET /servers` on the registry returns. An older registry sends `servers` only. */
export type RegistryAnswer = {
  servers: RegisteredServer[];
  machineId?: string;
  addresses?: string[];
};
