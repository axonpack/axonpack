import type { DevPreviewServer } from "../dev-preview-servers/merge-servers.util";
import type { PreviewItem } from "./preview-items.util";
import type { PreviewListLabels } from "../../components/preview-list/preview-list.types";

/** Where the default bundle that runs now comes from. */
export type DefaultSource =
  /** The bundle inside the app: a release build, or anything not loaded from Metro. */
  | "built-in"
  /** A Metro the preview registry does not know, such as `expo start` or `expo run:ios`. */
  | "expo-dev-server"
  /** A Metro announced by `preview start`. */
  | "dev-preview-server";

/** What this start runs: a local Metro server, a downloaded preview, or the app's own bundle. */
export type Running =
  | {
      /** A dev preview server picked in the list. */
      kind: "local";
      url: string;
      hostPort: string;
      /** Null until the dev preview servers list has found it. */
      server: DevPreviewServer | null;
    }
  | { kind: "preview"; id: string; title: string }
  | {
      kind: "default";
      source: DefaultSource;
      /** The Metro bundle URL, or null when the bundle is built into the app. */
      url: string | null;
      hostPort: string | null;
      /** The matching server from the list; null for built-in or when none was found. */
      server: DevPreviewServer | null;
    };

const isHttp = (url: string) => /^https?:\/\//i.test(url);

/** `host:port` of an http URL; the port defaults by scheme, as the browser would. */
export function hostPortOf(url: string): string | null {
  const match = /^(https?):\/\/([^/?#]+)/i.exec(url);
  if (!match) return null;
  const [, scheme, authority] = match;
  return /:\d+$/.test(authority)
    ? authority
    : `${authority}:${scheme.toLowerCase() === "https" ? 443 : 80}`;
}

// The computer the app's Metro runs on, under each name it goes by: itself, the iOS simulator
// (which shares its network), and the Android emulator, where 10.0.2.2 is the computer and
// localhost reaches it through `adb reverse`.
const THIS_COMPUTER = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "10.0.2.2",
]);

const splitHostPort = (hostPort: string) => {
  const at = hostPort.lastIndexOf(":");
  return {
    host: hostPort.slice(0, at).toLowerCase(),
    port: hostPort.slice(at + 1),
  };
};

/** Same port, and the same host or two names for the developer's computer. */
export function sameServer(a: string, b: string): boolean {
  const x = splitHostPort(a);
  const y = splitHostPort(b);
  if (x.port !== y.port) return false;
  return (
    x.host === y.host ||
    (THIS_COMPUTER.has(x.host) && THIS_COMPUTER.has(y.host))
  );
}

/**
 * Whether the app runs from the server at `hostPort` now: one picked by hand, or the Metro the
 * app started on with nothing picked. Never while a preview runs, since Metro is not used then.
 */
export function runsFromServer(running: Running, hostPort: string): boolean {
  return (
    running.kind !== "preview" &&
    running.hostPort !== null &&
    sameServer(hostPort, running.hostPort)
  );
}

const findServer = (servers: DevPreviewServer[], hostPort: string) =>
  servers.find((s) => sameServer(s.hostPort, hostPort)) ?? null;

export function runningNow(input: {
  items: PreviewItem[];
  activeId: string | null;
  /** The dev preview server picked in the list, from the native state. */
  localUrl: string | null;
  servers: DevPreviewServer[];
  /**
   * What React Native says it loaded (`SourceCode.scriptURL`). Without it, only the choice the
   * native side holds is known, and the default counts as built in.
   */
  scriptUrl?: string | null;
  /** `host:port` of the Metro the app starts on with nothing picked, from the native state. */
  defaultServer?: string | null;
}): Running {
  const { localUrl, scriptUrl = null, defaultServer = null } = input;
  const metro = scriptUrl && isHttp(scriptUrl) ? scriptUrl : null;
  // A dev preview server wins over a picked preview on the native side, so it wins here too.
  if (localUrl) {
    const hostPort =
      hostPortOf(metro ?? localUrl) ??
      localUrl.replace(/^\w+:\/\/([^/]+).*$/, "$1");
    const server =
      input.servers.find((s) => s.url === localUrl) ??
      findServer(input.servers, hostPort);
    // Picked by hand but the same Metro the app starts on anyway, it changes nothing: the default.
    if (!defaultServer || !sameServer(hostPort, defaultServer))
      return {
        kind: "local",
        url: localUrl,
        hostPort: server?.hostPort ?? hostPort,
        server,
      };
  }
  // A preview that could not load (another Hermes, the crash fallback) leaves the default running,
  // so when the loaded file is known it must be the preview's own.
  const previewLoaded =
    input.activeId &&
    (scriptUrl === null || scriptUrl.includes(`/preview/${input.activeId}/`));
  if (input.activeId && previewLoaded) {
    const item = input.items.find((i) => i.active);
    return {
      kind: "preview",
      id: input.activeId,
      title: item?.entry.title ?? input.activeId,
    };
  }
  if (metro) {
    const hostPort = hostPortOf(metro) as string;
    const server = findServer(input.servers, hostPort);
    return {
      kind: "default",
      source: server?.announced ? "dev-preview-server" : "expo-dev-server",
      url: metro,
      hostPort,
      server,
    };
  }
  return {
    kind: "default",
    source: "built-in",
    url: null,
    hostPort: null,
    server: null,
  };
}

type KindLabels = Pick<
  PreviewListLabels,
  "kindBuiltIn" | "kindExpoDevServer" | "kindDevPreviewServer" | "kindPreview"
>;

/** Where a bundle comes from, the same for what runs now and for a server row. */
export type BundleKind = DefaultSource | "preview";

export function bundleKind(running: Running): BundleKind {
  if (running.kind === "preview") return "preview";
  // A server picked from the scan that `preview start` never announced is a plain Expo one.
  if (running.kind === "local")
    return running.server && !running.server.announced
      ? "expo-dev-server"
      : "dev-preview-server";
  return running.source;
}

const KIND_LABEL: Record<BundleKind, keyof KindLabels> = {
  "built-in": "kindBuiltIn",
  "expo-dev-server": "kindExpoDevServer",
  "dev-preview-server": "kindDevPreviewServer",
  preview: "kindPreview",
};

/** A kind's name: what its chip and the banner say. */
export const kindLabel = (kind: BundleKind, labels: KindLabels): string =>
  labels[KIND_LABEL[kind]];

/** The kind of thing running, by its label: what the hero card's chip and the banner say. */
export const runningKind = (running: Running, labels: KindLabels): string =>
  kindLabel(bundleKind(running), labels);

const LOOPBACK = new Set(["127.0.0.1", "::1", "[::1]"]);

/**
 * `host:port` as people read it: the loopback addresses become localhost, so one machine is not
 * shown as localhost in one place and 127.0.0.1 in another.
 */
export function displayHostPort(hostPort: string): string {
  const { host, port } = splitHostPort(hostPort);
  return LOOPBACK.has(host) ? `localhost:${port}` : hostPort;
}

/** Where what runs comes from, in one short line: a server's address or a preview's branch or id. */
export function runningWhere(running: Running): string | null {
  if (running.kind === "preview") return running.id;
  return running.hostPort ? displayHostPort(running.hostPort) : null;
}

/**
 * A sentence for what runs now, such as "Expo dev server, localhost:8081" or "Preview, Login
 * fix": what a screen reader says for the hero card, and the example's banner.
 */
export function runningLabel(running: Running, labels: KindLabels): string {
  const name =
    running.kind === "preview"
      ? running.title
      : running.server?.announced
        ? running.server.title
        : null;
  return [
    runningKind(running, labels),
    name,
    running.kind === "preview" ? null : runningWhere(running),
  ]
    .filter(Boolean)
    .join(", ");
}
