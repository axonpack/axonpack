import { Image, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import WebView from 'react-native-webview';

import { CodeHighlight } from './detail-panel/code-highlight';
import { JsonTree } from './detail-panel/json-tree';
import { COLORS } from '../../constants/colors.const';
import { detectLanguage } from '../../utils/network/code-highlight.util';
import type { JsonValue } from '../../utils/network/json-tree.util';

// Attempted regardless of the content-type header, since it's common for APIs to omit or
// mislabel it — a body that happens to parse as JSON is shown as JSON either way.
function parseJson(body: string): JsonValue | undefined {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function isImage(mimeType: string | undefined): boolean {
  return mimeType?.toLowerCase().startsWith('image/') ?? false;
}

function isHtml(mimeType: string | undefined): boolean {
  return mimeType?.toLowerCase().includes('html') ?? false;
}

function isSvg(mimeType: string | undefined): boolean {
  return mimeType?.toLowerCase().includes('svg') ?? false;
}

/** Wraps a bare `<svg>` fragment in a minimal document — Android's WebView won't reliably
 * render a fragment passed directly as `source.html`, unlike a full HTML document. */
function wrapSvgDocument(svg: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0">${svg}</body></html>`;
}

/**
 * JSON tree if the body parses as JSON, a live WebView render for HTML/SVG, an `Image` for
 * image responses, else syntax-highlighted text — shared between the Preview tab and the
 * sandbox's response view so both render a body the same way.
 *
 * Images re-fetch from `url` rather than reusing the captured `body`: response bodies are
 * captured via `.text()` (see patch-fetch/xhr services), which corrupts binary data, so it
 * can't be turned back into image bytes reliably.
 */
export function ResponseBodyPreview({
  body,
  mimeType,
  url,
  emptyText,
  emptyTextStyle,
}: {
  body: string | undefined;
  mimeType: string | undefined;
  url: string;
  emptyText: string;
  emptyTextStyle: StyleProp<TextStyle>;
}) {
  if (isImage(mimeType)) {
    return <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />;
  }

  if (!body) return <Text style={emptyTextStyle}>{emptyText}</Text>;

  if (isHtml(mimeType)) {
    return <WebView source={{ html: body, baseUrl: url }} style={styles.webview} />;
  }

  if (isSvg(mimeType)) {
    return (
      <WebView source={{ html: wrapSvgDocument(body), baseUrl: url }} style={styles.webview} />
    );
  }

  const parsed = parseJson(body);
  if (parsed !== undefined) return <JsonTree value={parsed} />;
  return <CodeHighlight code={body} language={detectLanguage(mimeType, body)} />;
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 240,
    backgroundColor: COLORS.toolbarBackground,
    borderRadius: 6,
  },
  webview: {
    height: 320,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
});
