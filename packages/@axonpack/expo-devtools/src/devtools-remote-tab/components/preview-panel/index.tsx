import { PreviewHost } from '../../../features/preview/components/preview-host.component';
import { PreviewView } from '../../../features/preview/components/preview-view.component';

/**
 * The same list as the in-app Preview tab. A DevTools tab is a React root of its own, so the app's
 * preview provider isn't above it, and this one mounts preview's provider again. That reads the
 * list once more each time the panel opens.
 */
export function PreviewPanel() {
  return (
    <PreviewHost>
      <PreviewView virtualized={false} />
    </PreviewHost>
  );
}
