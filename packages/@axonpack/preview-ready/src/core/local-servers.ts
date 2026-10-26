// Shapes and defaults shared by `preview-ready start`, its registry and the app.

import type { Compatibility, Platform } from "./layout";

/** Where the registry listens on the developer's computer. */
export const DEFAULT_REGISTRY_PORT = 19150;

/** Ports `preview-ready start` picks from, and the app probes for plain `expo start` servers. */
export const DEFAULT_PORT_RANGE: [number, number] = [8081, 8099];

/** A heartbeat is sent this often, and a server missing for TTL is dropped. */
export const HEARTBEAT_MS = 5000;
export const SERVER_TTL_MS = 15000;

/** What `preview-ready start` tells the registry about the Metro it runs. */
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
