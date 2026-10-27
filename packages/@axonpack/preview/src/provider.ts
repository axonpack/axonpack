import {
  createContext,
  createElement as h,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import type { PreviewConfig } from "./config";
import { markLaunched } from "./native";
import { previewItems } from "./preview-items";
import { previewsStore, usePreviewsState } from "./previews.store";

const ConfigContext = createContext<PreviewConfig | null>(null);

/**
 * Put it near the root. Once mounted it tells the native side this start worked (the crash
 * fallback waits for that), and with `enabled` it reads the downloads and the bucket's list.
 */
export function PreviewProvider(props: {
  config: PreviewConfig;
  children?: ReactNode;
}) {
  useEffect(() => {
    markLaunched();
  }, []);
  useEffect(() => {
    if (props.config.enabled)
      previewsStore.refresh(props.config).catch(() => undefined);
  }, [props.config]);
  return h(ConfigContext.Provider, { value: props.config }, props.children);
}

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
      devPreviewServers: config.devPreviewServers === true,
      refresh: () => previewsStore.refresh(config),
      download: (id: string) => previewsStore.download(config, id),
      switchTo: (id: string | null) => previewsStore.switchTo(config, id),
      remove: (id: string) => previewsStore.remove(id),
      removeIncompatible: () => previewsStore.removeIncompatible(),
    }),
    [state, lists, config],
  );
}
