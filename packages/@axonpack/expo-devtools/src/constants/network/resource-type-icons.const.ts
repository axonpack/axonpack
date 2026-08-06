import type { MaterialIconName } from '../../components/ui/icon-button.ui';
import type { ResourceType } from '../../utils/network/resource-type.util';
import { COLORS } from '../colors.const';

// Pictorial glyphs only. Material ships lettering-as-icon glyphs named `http`, `css`, `html` and
// `javascript` that literally draw the words "HTTP"/"CSS"/"HTML"/"JS", which read as stray text
// next to a row of real icons rather than as icons.
export const RESOURCE_TYPE_ICONS: Record<ResourceType, MaterialIconName> = {
  'fetch-xhr': 'swap-horiz',
  js: 'code',
  img: 'image',
  media: 'play-circle-outline',
  other: 'insert-drive-file',
};

/** `kind: 'json'` has no MaterialIcon behind it — it's drawn by `JsonIcon`. See that file for why. */
export type ResponseTypeVisual =
  { kind: 'material'; icon: MaterialIconName; color: string } | { kind: 'json'; color: string };

/** Orange, shared by the two types that get a warm accent. */
const ORANGE = '#e8710a';

/**
 * Per-row icon + color keyed directly off `mimeType`, matching Chrome DevTools' Network tab
 * file-type icons — more granular than the `ResourceType` filter-chip buckets above (which
 * group CSS/HTML/JSON/fonts/wasm together under "Fetch/XHR"/"Other" for filtering purposes).
 */
export function getResponseTypeVisual(mimeType: string | undefined): ResponseTypeVisual {
  // Also the in-flight case — a pending request has no content-type yet.
  if (!mimeType) return { kind: 'material', icon: 'swap-horiz', color: COLORS.textSecondary };

  if (mimeType.startsWith('image/')) {
    return { kind: 'material', icon: 'image', color: COLORS.accent };
  }
  if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
    return { kind: 'material', icon: 'play-circle-outline', color: ORANGE };
  }
  if (mimeType.includes('javascript') || mimeType === 'application/x-javascript') {
    return { kind: 'material', icon: 'code', color: COLORS.warning };
  }
  if (mimeType.includes('css')) return { kind: 'material', icon: 'palette', color: '#9334e6' };
  if (mimeType.includes('html')) return { kind: 'material', icon: 'web', color: COLORS.accent };
  if (mimeType.includes('font') || /\b(woff2?|ttf|otf)\b/.test(mimeType)) {
    return { kind: 'material', icon: 'font-download', color: COLORS.success };
  }
  if (mimeType.includes('wasm')) return { kind: 'material', icon: 'memory', color: '#9334e6' };
  if (mimeType.includes('json')) return { kind: 'json', color: ORANGE };
  if (mimeType.includes('xml') || mimeType.includes('text/plain')) {
    return { kind: 'material', icon: 'description', color: COLORS.textSecondary };
  }

  return { kind: 'material', icon: 'insert-drive-file', color: COLORS.textSecondary };
}
