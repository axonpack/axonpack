import type { DevPreviewServer } from "../dev-preview-servers/merge-servers.util";
import type { DevServerHost } from "../dev-preview-servers/hosts.util";
import type { LocalPreview } from "../../services/previews/local-previews.service";
import type { PreviewItem } from "../previews/preview-items.util";

/** A line of plain text in the list; the component turns the name into the label. */
export type ListHint =
  "noBuildSlug" | "noDevPreviewServers" | "empty" | "noBuildKey";

/** Where a row sits in a group drawn as one card: it decides the corners and the separator. */
export type GroupPosition = "first" | "middle" | "last" | "only";

const positionOf = (index: number, count: number): GroupPosition =>
  count === 1
    ? "only"
    : index === 0
      ? "first"
      : index === count - 1
        ? "last"
        : "middle";

/** One row of the list's FlatList. `key` is stable across refreshes. */
export type ListItem =
  | {
      type: "dev-servers-header";
      key: string;
      error: string | null;
      scanning: boolean;
    }
  | {
      type: "dev-server-hosts";
      key: string;
      hosts: DevServerHost[];
      allowCustomHosts: boolean;
    }
  | {
      type: "dev-server";
      key: string;
      server: DevPreviewServer;
      position: GroupPosition;
    }
  | { type: "hint"; key: string; hint: ListHint; tone: "muted" | "danger" }
  | { type: "previews-header"; key: string }
  | { type: "preview"; key: string; item: PreviewItem }
  | { type: "incompatible-header"; key: string }
  | {
      type: "incompatible";
      key: string;
      preview: LocalPreview;
      position: GroupPosition;
    };

export function buildListItems(state: {
  /** Debug build with dev preview servers turned on. */
  showDevServers: boolean;
  hasSlug: boolean;
  servers: DevPreviewServer[];
  devServersError: string | null;
  /** A full sweep of the port range runs now. */
  devServersScanning: boolean;
  /** Where the dev servers list looks. */
  hosts: DevServerHost[];
  /** "Add a host" shows after the hosts. */
  allowCustomHosts: boolean;
  loading: boolean;
  buildKey: string | null;
  items: PreviewItem[];
  incompatible: LocalPreview[];
}): ListItem[] {
  const list: ListItem[] = [];
  if (state.showDevServers) {
    list.push({
      type: "dev-servers-header",
      key: "dev-servers",
      error: state.devServersError,
      scanning: state.devServersScanning,
    });
    // Without a slug nothing is asked, so no host is checked.
    if (state.hasSlug)
      list.push({
        type: "dev-server-hosts",
        key: "dev-server-hosts",
        hosts: state.hosts,
        allowCustomHosts: state.allowCustomHosts,
      });
    if (!state.hasSlug)
      list.push({
        type: "hint",
        key: "hint:noBuildSlug",
        hint: "noBuildSlug",
        tone: "danger",
      });
    else if (state.servers.length === 0)
      list.push({
        type: "hint",
        key: "hint:noDevPreviewServers",
        hint: "noDevPreviewServers",
        tone: "muted",
      });
    else
      state.servers.forEach((server, index) =>
        list.push({
          type: "dev-server",
          key: `server:${server.hostPort}`,
          server,
          position: positionOf(index, state.servers.length),
        }),
      );
  }
  list.push({ type: "previews-header", key: "previews" });
  for (const item of state.items)
    list.push({ type: "preview", key: `preview:${item.id}`, item });
  // While the first answer is on its way, "nothing published" would be a guess.
  if (state.items.length === 0 && !state.loading) {
    const hint = state.buildKey ? "empty" : "noBuildKey";
    list.push({ type: "hint", key: `hint:${hint}`, hint, tone: "muted" });
  }
  if (state.incompatible.length > 0) {
    list.push({ type: "incompatible-header", key: "incompatible" });
    state.incompatible.forEach((preview, index) =>
      list.push({
        type: "incompatible",
        key: `incompatible:${preview.id}`,
        preview,
        position: positionOf(index, state.incompatible.length),
      }),
    );
  }
  return list;
}
