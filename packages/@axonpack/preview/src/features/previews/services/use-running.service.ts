import { nativeModule } from "../../../core/services/native.service";
import { usePreview } from "../../../core/components/preview-provider.component";
import { useDevPreviewServersState } from "../../dev-preview-servers/stores/dev-preview-servers.store";
import { type Running, runningNow } from "../utils/running.util";

/** What runs now, read from the package's state. Needs a `<PreviewProvider>` above it. */
export function useRunning(): Running {
  const preview = usePreview();
  const local = useDevPreviewServersState();
  const showLocal = __DEV__ && preview.devPreviewServers;
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
