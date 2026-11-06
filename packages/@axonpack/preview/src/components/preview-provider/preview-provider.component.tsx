import { createContext, useEffect, type ReactNode } from "react";

import type { PreviewConfig } from "../../utils/config/config.util";
import { markLaunched } from "../../services/native/native.service";
import {
  checkRunningFiles,
  previewsStore,
} from "../../stores/previews/previews.store";

export const ConfigContext = createContext<PreviewConfig | null>(null);

/**
 * Put it near the root. Once mounted it tells the native side this start worked (the crash
 * fallback waits for that), checks the running preview's file sets, and with `enabled` it reads
 * the downloads and the bucket's list.
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
  // With `enabled` off too: a preview that runs still needs its files checked.
  useEffect(() => {
    checkRunningFiles(props.config).catch(() => undefined);
  }, [props.config]);
  return (
    <ConfigContext.Provider value={props.config}>
      {props.children}
    </ConfigContext.Provider>
  );
}
