import type { DevPreviewServer, PreviewItem, PreviewStatusInfo } from '@axonpack/preview';

import { createAxonStore } from '../../../../core/stores/axon.store';

/** What `useSupport()` returns: preview's own state, copied in by the support's provider. */
export type PreviewSupportData = {
  /**
   * What runs now and the build it runs in, as preview's `usePreviewStatus()` gives it. Null until
   * preview's provider has rendered once, and always null when preview can't run.
   */
  status: PreviewStatusInfo | null;
  /** The previews published for this build, and downloads the bucket no longer lists. */
  previews: PreviewItem[];
  /** The dev servers preview's last look found. Debug builds with `devPreviewServers` on only. */
  servers: DevPreviewServer[];
};

export const previewSupportStore = createAxonStore<PreviewSupportData, object>(
  { status: null, previews: [], servers: [] },
  () => ({})
);

/**
 * The hook every support entry exports under this name. It reads the support's store, which the
 * `preview` CLI topic and the `>` prompt's `preview` read too.
 */
export const useSupport = previewSupportStore.useStore;
