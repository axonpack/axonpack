import type { ReactNode } from 'react';

import { previewStore, usePreviewStore } from '../stores/preview.store';

/** Preview's own provider around `children`, once `config.preview` has set it up. */
export function PreviewHost({ children }: { children?: ReactNode }) {
  const preview = usePreviewStore(previewStore.getModule);
  const config = usePreviewStore(previewStore.getConfig);
  if (!preview || !config) return <>{children}</>;
  return <preview.PreviewProvider config={config}>{children}</preview.PreviewProvider>;
}
