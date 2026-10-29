import { DEFAULT_LABELS } from "../../constants/preview-list/theme.const";
import type { PreviewListLabels } from "../../components/preview-list/preview-list.types";
import { devPreviewServersStore } from "../../stores/dev-preview-servers/dev-preview-servers.store";
import { currentPlatform } from "../../utils/config/config.util";
import type { Compatibility, Platform } from "../../utils/previews/layout.util";
import {
  type BundleKind,
  type Running,
  bundleKind,
  displayHostPort,
  kindLabel,
  runningLabel,
} from "../../utils/previews/running.util";
import {
  buildApp,
  buildCompatibility,
  buildKey,
} from "../native/build-info.service";
import { usePreview } from "./use-preview.service";
import { useRunning } from "./use-running.service";

/** Everything the list's header card shows, for a banner, badge or debug screen of your own. */
export type PreviewStatusInfo = {
  /** What runs now, as `useRunning()` returns it. */
  running: Running;
  /** A server picked in the list, a preview, or the default bundle. */
  kind: Running["kind"];
  /** Where it comes from, which picks the header's kind chip. */
  bundleKind: BundleKind;
  /** The header's headline: the preview's or the server's title, "Default", or the kind's name. */
  title: string;
  /** The running preview's id; null for a server or the default bundle. */
  id: string | null;
  /** The running preview's or the server's branch, when known. */
  branch: string | null;
  /** A server's `host:port`, with loopback shown as localhost; null for a preview or built in. */
  address: string | null;
  /** One sentence for what runs, such as "Expo dev server, localhost:8081". */
  label: string;
  /** The default bundle runs: nothing picked, or what was picked is what the app starts on anyway. */
  isDefault: boolean;
  /** The running preview's EAS environment, author, full commit and ISO publish date. */
  environment: string | null;
  author: string | null;
  commit: string | null;
  publishedAt: string | null;
  /** This build as installed. Nulls on a native side older than this JS. */
  app: {
    name: string | null;
    version: string | null;
    buildNumber: string | null;
    platform: Platform | null;
  };
  /** How this build is matched with previews, and the key it lists them under. */
  compatibility: { mode: Compatibility | null; key: string | null };
  /** The previews list is loading, and the last thing that went wrong with it. */
  loading: boolean;
  error: string | null;
  /** A preview is chosen (even one that could not load) or a server is picked. */
  canGoBack: boolean;
  /** Restarts on the default bundle, clearing the chosen preview and the picked server. */
  backToDefault: () => Promise<void>;
  /** Asks the bucket again, and looks for dev preview servers when they are on. */
  refresh: () => Promise<void>;
};

/**
 * What runs now and the build it runs in. Needs a `<PreviewProvider>` above it. `labels` names
 * the kinds in `title` and `label`, the list's defaults otherwise.
 */
export function usePreviewStatus(
  labels?: Partial<PreviewListLabels>,
): PreviewStatusInfo {
  const preview = usePreview();
  const running = useRunning();
  const words = { ...DEFAULT_LABELS, ...labels };
  const kind = bundleKind(running);
  const entry =
    running.kind === "preview"
      ? (preview.items.find((i) => i.id === running.id)?.entry ?? null)
      : null;
  const server = running.kind === "preview" ? null : running.server;
  // Metro only knows the app's name, so the Metro the app starts on, when `preview start` gave it
  // no title, is called by its role.
  const title =
    running.kind === "preview"
      ? running.title
      : running.kind === "default" && running.source === "expo-dev-server"
        ? words.defaultServerTitle
        : (server?.title ?? kindLabel(kind, words));
  const showLocal = __DEV__ && preview.devPreviewServers;

  return {
    running,
    kind: running.kind,
    bundleKind: kind,
    title,
    id: running.kind === "preview" ? running.id : null,
    branch:
      (running.kind === "preview" ? entry?.branch : server?.branch) || null,
    address:
      running.kind !== "preview" && running.hostPort
        ? displayHostPort(running.hostPort)
        : null,
    label: runningLabel(running, words),
    isDefault: running.kind === "default",
    environment: entry?.environment || null,
    author: entry?.author || null,
    commit: entry?.commit || null,
    publishedAt: entry?.publishedAt || null,
    app: { ...buildApp(), platform: currentPlatform() },
    compatibility: {
      mode: buildCompatibility(),
      key: preview.buildKey ?? buildKey(),
    },
    loading: preview.loading,
    error: preview.error,
    canGoBack: Boolean(preview.activeId) || running.kind === "local",
    backToDefault: () => preview.switchTo(null),
    refresh: async () => {
      await Promise.all([
        preview.refresh(),
        showLocal ? devPreviewServersStore.refresh() : null,
      ]);
    },
  };
}
