import type { DevPreviewServer } from "../dev-preview-servers/merge-servers.util";
import type { LocalPreview } from "../../services/previews/local-previews.service";
import type { PreviewItem } from "../previews/preview-items.util";

/** A line of plain text in the list; the component turns the name into the label. */
export type ListHint =
  "noBuildSlug" | "noDevPreviewServers" | "empty" | "noBuildKey";

/** One row of the list's FlatList. `key` is stable across refreshes. */
export type ListItem =
  | { type: "dev-servers-header"; key: string; error: string | null }
  | { type: "dev-server"; key: string; server: DevPreviewServer }
  | { type: "hint"; key: string; hint: ListHint; tone: "muted" | "danger" }
  | { type: "previews-header"; key: string }
  | { type: "preview"; key: string; item: PreviewItem }
  | { type: "incompatible-header"; key: string }
  | { type: "incompatible"; key: string; preview: LocalPreview };

export function buildListItems(state: {
  /** Debug build with dev preview servers turned on. */
  showDevServers: boolean;
  hasSlug: boolean;
  servers: DevPreviewServer[];
  devServersError: string | null;
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
      for (const server of state.servers)
        list.push({
          type: "dev-server",
          key: `server:${server.hostPort}`,
          server,
        });
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
    for (const preview of state.incompatible)
      list.push({
        type: "incompatible",
        key: `incompatible:${preview.id}`,
        preview,
      });
  }
  return list;
}
