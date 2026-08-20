import type { MaterialIconName } from '../../../core/components/ui/icon-button.ui';
import type { ResourceType } from '../utils/resource-type.util';
import type { Palette } from '../../../core/constants/theme.const';

export const RESOURCE_TYPE_ICONS: Record<ResourceType, MaterialIconName> = {
  'fetch-xhr': 'swap-horiz',
  js: 'code',
  img: 'image',
  media: 'play-circle-outline',
  other: 'insert-drive-file',
};

export type ResponseTypeVisual =
  { kind: 'material'; icon: MaterialIconName; color: string } | { kind: 'json'; color: string };

const ORANGE = '#e8710a';

export function getResponseTypeVisual(
  mimeType: string | undefined,
  COLORS: Palette
): ResponseTypeVisual {
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
