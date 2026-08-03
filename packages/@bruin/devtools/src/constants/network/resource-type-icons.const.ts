import type { MaterialIconName } from '../../components/ui/icon-button.ui';
import type { ResourceType } from '../../utils/network/resource-type.util';
import { COLORS } from '../colors.const';

export const RESOURCE_TYPE_ICONS: Record<ResourceType, MaterialIconName> = {
  'fetch-xhr': 'http',
  js: 'code',
  img: 'image',
  media: 'play-circle-outline',
  other: 'insert-drive-file',
};

export interface ResponseTypeVisual {
  icon: MaterialIconName;
  color: string;
}

/**
 * Per-row icon + color keyed directly off `mimeType`, matching Chrome DevTools' Network tab
 * file-type icons — more granular than the `ResourceType` filter-chip buckets above (which
 * group CSS/HTML/JSON/fonts/wasm together under "Fetch/XHR"/"Other" for filtering purposes).
 */
export function getResponseTypeVisual(mimeType: string | undefined): ResponseTypeVisual {
  if (!mimeType) return { icon: 'http', color: COLORS.textSecondary };

  if (mimeType.startsWith('image/')) return { icon: 'image', color: COLORS.accent };
  if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
    return { icon: 'play-circle-outline', color: '#e8710a' };
  }
  if (mimeType.includes('javascript') || mimeType === 'application/x-javascript') {
    return { icon: 'javascript', color: COLORS.warning };
  }
  if (mimeType.includes('css')) return { icon: 'css', color: '#9334e6' };
  if (mimeType.includes('html')) return { icon: 'html', color: COLORS.accent };
  if (mimeType.includes('font') || /\b(woff2?|ttf|otf)\b/.test(mimeType)) {
    return { icon: 'font-download', color: COLORS.success };
  }
  if (mimeType.includes('wasm')) return { icon: 'memory', color: '#9334e6' };
  if (mimeType.includes('json')) return { icon: 'data-object', color: COLORS.success };
  if (mimeType.includes('xml') || mimeType.includes('text/plain')) {
    return { icon: 'http', color: COLORS.textSecondary };
  }

  return { icon: 'insert-drive-file', color: COLORS.textSecondary };
}
