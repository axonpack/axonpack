import { useContext, useMemo } from "react";

import { ConfigContext } from "../../components/preview-provider/preview-provider.component";
import { previewItems } from "../../utils/previews/preview-items.util";
import {
  devServersSetup,
  previewsConfigured,
} from "../../utils/config/config.util";
import {
  previewsStore,
  usePreviewsState,
} from "../../stores/previews/previews.store";

/** The list and its actions, for the built-in list or a screen of your own. */
export function usePreview() {
  const config = useContext(ConfigContext);
  if (!config)
    throw new Error("usePreview needs a <PreviewProvider> above it.");
  const state = usePreviewsState();
  const lists = useMemo(() => previewItems(state), [state]);
  return useMemo(
    () => ({
      ...state,
      ...lists,
      enabled: config.enabled,
      previewsConfigured: previewsConfigured(config),
      devPreviewServers: devServersSetup(config.devPreviewServers).enabled,
      refresh: () => previewsStore.refresh(config),
      download: (id: string) => previewsStore.download(config, id),
      switchTo: (id: string | null) => previewsStore.switchTo(config, id),
      remove: (id: string) => previewsStore.remove(id),
      removeIncompatible: () => previewsStore.removeIncompatible(),
    }),
    [state, lists, config],
  );
}
