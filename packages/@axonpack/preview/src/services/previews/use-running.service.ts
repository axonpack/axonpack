import { useEffect } from "react";

import { nativeModule, scriptUrl } from "../native/native.service";
import { usePreview } from "./use-preview.service";
import {
  devPreviewServersStore,
  useDevPreviewServersState,
} from "../../stores/dev-preview-servers/dev-preview-servers.store";
import { type Running, runningNow } from "../../utils/previews/running.util";

/** What runs now, read from the package's state. Needs a `<PreviewProvider>` above it. */
export function useRunning(): Running {
  const preview = usePreview();
  const local = useDevPreviewServersState();
  const showLocal = __DEV__ && preview.devPreviewServers;
  // The first poll fills activeUrl a moment after the list mounts, but native knows it from the start.
  const localUrl = showLocal
    ? (local.activeUrl ?? nativeModule()?.state().localServer ?? null)
    : null;
  const loadedFrom = scriptUrl();
  // Whether the base's Metro is a `preview start` server shows in the servers list, which is
  // filled only while the list is on screen. One look is enough for the banner on other screens.
  const fromMetro = Boolean(loadedFrom?.startsWith("http"));
  useEffect(() => {
    if (
      showLocal &&
      fromMetro &&
      devPreviewServersStore.getState().servers.length === 0
    )
      devPreviewServersStore.refresh();
  }, [showLocal, fromMetro]);
  return runningNow({
    items: preview.items,
    activeId: preview.activeId,
    localUrl,
    servers: local.servers,
    scriptUrl: loadedFrom,
  });
}
