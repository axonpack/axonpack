import type { LocalServer } from "./local-servers";
import { useLocalServersState } from "./local-servers.store";
import { nativeModule } from "./native";
import type { PreviewItem } from "./preview-items";
import { usePreview } from "./provider";

/** What this start runs: a local Metro server, a downloaded preview, or the app's own bundle. */
export type Running =
  | {
      kind: "local";
      url: string;
      hostPort: string;
      /** Null until the local servers list has found it. */
      server: LocalServer | null;
    }
  | { kind: "preview"; id: string; title: string }
  | { kind: "base" };

export function runningNow(input: {
  items: PreviewItem[];
  activeId: string | null;
  localUrl: string | null;
  servers: LocalServer[];
}): Running {
  const { localUrl } = input;
  // A local server wins over a picked preview on the native side, so it wins here too.
  if (localUrl) {
    const server = input.servers.find((s) => s.url === localUrl) ?? null;
    return {
      kind: "local",
      url: localUrl,
      hostPort:
        server?.hostPort ?? localUrl.replace(/^\w+:\/\/([^/]+).*$/, "$1"),
      server,
    };
  }
  if (input.activeId) {
    const item = input.items.find((i) => i.active);
    return {
      kind: "preview",
      id: input.activeId,
      title: item?.entry.title ?? input.activeId,
    };
  }
  return { kind: "base" };
}

/** What runs now, read from the package's state. Needs a `<PreviewProvider>` above it. */
export function useRunning(): Running {
  const preview = usePreview();
  const local = useLocalServersState();
  const showLocal = __DEV__ && preview.localServers?.enabled === true;
  // The first poll fills activeUrl a moment after the list mounts, but native knows it from the start.
  const localUrl = showLocal
    ? (local.activeUrl ?? nativeModule()?.state().localServer ?? null)
    : null;
  return runningNow({
    items: preview.items,
    activeId: preview.activeId,
    localUrl,
    servers: local.servers,
  });
}
