import {
  createContext,
  createElement as h,
  useEffect,
  type ReactNode,
} from "react";

import type { PreviewConfig } from "../utils/config.util";
import { markLaunched } from "../services/native.service";
import { previewsStore } from "../../features/previews/stores/previews.store";

export const ConfigContext = createContext<PreviewConfig | null>(null);

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
