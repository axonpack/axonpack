/** How the Preview tab renders a body — `image` and `webview` are opaque surfaces that cannot be searched. */
export type PreviewKind = 'image' | 'webview' | 'text';

export function classifyPreview(mimeType: string | undefined): PreviewKind {
  const type = mimeType?.toLowerCase() ?? '';
  // Order matters: `image/svg+xml` is an image by this test before it is ever an SVG document.
  if (type.startsWith('image/')) return 'image';
  if (type.includes('html')) return 'webview';
  if (type.includes('svg')) return 'webview';
  return 'text';
}
