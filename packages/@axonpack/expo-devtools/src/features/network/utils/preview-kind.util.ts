import { Platform } from 'react-native';

/** How the Preview tab renders a body — `image` and `webview` are opaque surfaces that cannot be searched. */
export type PreviewKind = 'image' | 'webview' | 'text';

export function classifyPreview(mimeType: string | undefined): PreviewKind {
  const type = mimeType?.toLowerCase() ?? '';
  if (type.includes('image/svg+xml') || type.includes('svg')) {
    return Platform.OS === 'web' ? 'image' : 'webview';
  }
  if (type.startsWith('image/')) return 'image';
  if (type.includes('html')) return 'webview';
  return 'text';
}
