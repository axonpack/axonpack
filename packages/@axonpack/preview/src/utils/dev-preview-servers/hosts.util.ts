import { DEFAULT_REGISTRY_PORT } from "../../constants/dev-preview-servers/dev-preview-servers.const";
import { isThisComputer } from "../previews/running.util";

/** A computer the app asks for its preview servers: its address and its registry's port. */
export type HostAddress = { host: string; port: number };

/**
 * A host the dev servers list checks. `built-in` is this computer under the names it always goes
 * by, `app` is one from the app's config, and `user` is one added on the device.
 */
export type DevServerHost = HostAddress & {
  source: "built-in" | "app" | "user";
};

/** Why a host can't be added: it isn't an address, it is listed already, or it is always checked. */
export type HostProblem = "invalid" | "duplicate" | "builtIn";

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * "192.168.1.24", "qa-mac.local:19151", or a pasted "http://192.168.1.24/", as an address. An IPv4
 * address or a host name. The port, when given, is the registry's, so it defaults to 19150.
 */
export function parseHost(text: string): HostAddress | null {
  const match = /^(?:http:\/\/)?([^:/\s]+)(?::(\d{1,5}))?\/?$/.exec(
    text.trim().toLowerCase(),
  );
  if (!match) return null;
  const [, host, digits] = match;
  const port = digits ? Number(digits) : DEFAULT_REGISTRY_PORT;
  const labels = host.split(".");
  // All digits reads as an IP address, so it has to be a whole one.
  const valid = labels.every((label) => /^\d+$/.test(label))
    ? labels.length === 4 && labels.every((label) => Number(label) <= 255)
    : host.length <= 253 && labels.every((label) => LABEL.test(label));
  return valid && port >= 1 && port <= 65535 ? { host, port } : null;
}

/** How a host reads in the list: with its port only when that is not the registry's usual one. */
export const formatHost = ({ host, port }: HostAddress): string =>
  port === DEFAULT_REGISTRY_PORT ? host : `${host}:${port}`;

/** `text` as a host to add beside `taken`, or why it can't be added. */
export function checkNewHost(
  text: string,
  taken: readonly (HostAddress & { source?: DevServerHost["source"] })[],
): HostAddress | HostProblem {
  const address = parseHost(text);
  if (!address) return "invalid";
  if (
    isThisComputer(address.host) ||
    taken.some((t) => t.source === "built-in" && t.host === address.host)
  )
    return "builtIn";
  if (taken.some((t) => t.host === address.host && t.port === address.port))
    return "duplicate";
  return address;
}
