import { useContext, useMemo, useSyncExternalStore } from "react";

import { ConfigContext } from "../../components/preview-provider/preview-provider.component";
import {
  type PreviewFiles,
  filesCheck,
  previewFilesPath,
  subscribeFilesCheck,
} from "./preview-files.service";

/**
 * `previewFilesPath(name, config)` with the provider's config: where the copy of a file set that
 * goes with the running bundle is. Needs a `<PreviewProvider>` above it.
 */
export function usePreviewFiles(name: string): PreviewFiles {
  const config = useContext(ConfigContext);
  // What runs changes only with a restart. `ready` changes once, when the start's check settles.
  const check = useSyncExternalStore(subscribeFilesCheck, filesCheck);
  if (!config)
    throw new Error("usePreviewFiles needs a <PreviewProvider> above it.");
  return useMemo(() => previewFilesPath(name, config), [name, config, check]);
}
