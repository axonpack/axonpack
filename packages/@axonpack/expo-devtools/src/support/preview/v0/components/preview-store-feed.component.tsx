import { useEffect } from 'react';

import { previewSupportStore } from '../stores/preview-support.store';

/**
 * Copies preview's own state into the support's store after each change, from inside preview's
 * provider, so the CLI and the `>` prompt read it without a hook. Draws nothing.
 */
export function PreviewStoreFeed({ preview }: { preview: typeof import('@axonpack/preview') }) {
  const status = preview.usePreviewStatus();
  const { items } = preview.usePreview();
  const { servers } = preview.useDevPreviewServersState();
  useEffect(() => {
    previewSupportStore.setState({ status, previews: items, servers });
  });
  return null;
}
